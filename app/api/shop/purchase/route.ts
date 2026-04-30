import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPublicClient, http, parseUnits } from 'viem'
import { base } from 'viem/chains'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
})

const DEV_WALLET = '0xc616863b7c14868b87699c8028e89cef2fcd3c4a'
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const ITEM_PRICES: Record<string, number> = {
  flash:     5_000_000,  // $5 USDC (6 decimals)
  slow:      3_000_000,
  double:    3_000_000,
  magnet:    2_000_000,
  extralife: 4_000_000,
  vip:       5_000_000,
}

const ITEM_PRICES_DISCOUNTED: Record<string, number> = {
  flash: 2_000_000,  // $2 launch discount
}

// Track processed tx hashes to prevent replay
const processedTx = new Set<string>()

export async function POST(req: NextRequest) {
  try {
    const { wallet_address, item_key, tx_hash, quantity = 1 } = await req.json()

    if (!wallet_address || !item_key || !tx_hash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    if (!ITEM_PRICES[item_key]) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }

    // Prevent replay attack
    if (processedTx.has(tx_hash)) {
      return NextResponse.json({ error: 'Transaction already used' }, { status: 400 })
    }

    // Check DB for already processed tx
    const { data: existingPurchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('tx_hash', tx_hash)
      .single()

    if (existingPurchase) {
      return NextResponse.json({ error: 'Transaction already used' }, { status: 400 })
    }

    // Verify tx on Base mainnet
    let receipt
    try {
      receipt = await publicClient.getTransactionReceipt({ hash: tx_hash as `0x${string}` })
    } catch {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 400 })
    }

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json({ error: 'Transaction failed or pending' }, { status: 400 })
    }

    // Verify it's a USDC transfer to dev wallet
    // ERC20 Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

    const transferLog = receipt.logs.find(log => {
      if (log.address.toLowerCase() !== USDC.toLowerCase()) return false
      if (log.topics[0] !== TRANSFER_TOPIC) return false
      // to = topics[2], padded address
      const toAddress = '0x' + log.topics[2]?.slice(26)
      return toAddress.toLowerCase() === DEV_WALLET.toLowerCase()
    })

    if (!transferLog) {
      return NextResponse.json({ error: 'No valid USDC transfer to dev wallet found' }, { status: 400 })
    }

    // Verify amount
    const transferredAmount = BigInt(transferLog.data)
    const expectedPrice = ITEM_PRICES_DISCOUNTED[item_key] ?? ITEM_PRICES[item_key]
    const expectedTotal = BigInt(expectedPrice * quantity)

    if (transferredAmount < expectedTotal) {
      return NextResponse.json({
        error: `Insufficient payment. Expected ${expectedTotal}, got ${transferredAmount}`
      }, { status: 400 })
    }

    // Verify sender matches wallet
    const fromAddress = '0x' + transferLog.topics[1]?.slice(26)
    if (fromAddress.toLowerCase() !== wallet_address.toLowerCase()) {
      return NextResponse.json({ error: 'Transaction sender mismatch' }, { status: 400 })
    }

    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('id, items')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Update inventory
    const currentItems = player.items || {}
    const currentCount = currentItems[item_key] || 0

    // VIP is permanent (boolean-like), others stack
    const newCount = item_key === 'vip' ? 1 : currentCount + quantity

    const updatedItems = { ...currentItems, [item_key]: newCount }

    const { error: updateError } = await supabase
      .from('players')
      .update({ items: updatedItems })
      .eq('id', player.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
    }

    // Record purchase
    await supabase.from('purchases').insert({
      player_id: player.id,
      item_key,
      quantity,
      price_paid_usd: (Number(transferredAmount) / 1_000_000).toFixed(2),
      tx_hash,
    })

    // Mark tx as processed in memory too
    processedTx.add(tx_hash)

    return NextResponse.json({
      success: true,
      item: item_key,
      quantity,
      new_count: newCount,
      items: updatedItems,
    })

  } catch (error) {
    console.error('Shop purchase error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
