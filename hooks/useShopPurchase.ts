'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { usePlayerStore } from '@/store/playerStore'

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`
const DEV_WALLET = '0x4D9775d6846a1C7AF5039D3332572DeC722b4a5a' as `0x${string}`

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Item prices in USDC (6 decimals)
export const ITEM_PRICES_USD: Record<string, number> = {
  flash:     5,
  slow:      3,
  double:    3,
  magnet:    2,
  extralife: 4,
  vip:       5,
}

export const ITEM_DISCOUNTS: Record<string, number> = {
  flash: 2,  // $2 during launch week
}

export type PurchaseStatus = 'idle' | 'sending' | 'confirming' | 'verifying' | 'done' | 'error'

export function useShopPurchase() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const { player, setPlayer } = usePlayerStore()
  const [status, setStatus] = useState<PurchaseStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const purchase = useCallback(async (itemKey: string, quantity = 1) => {
    if (!address) { setErrorMsg('Wallet not connected'); return false }

    const priceUsd = ITEM_DISCOUNTS[itemKey] ?? ITEM_PRICES_USD[itemKey]
    if (!priceUsd) { setErrorMsg('Invalid item'); return false }

    const totalUsdc = parseUnits((priceUsd * quantity).toString(), 6)

    setStatus('sending')
    setErrorMsg('')

    let txHash: `0x${string}`

    try {
      // Direct USDC transfer to dev wallet (no approve needed, just transfer)
      txHash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [DEV_WALLET, totalUsdc],
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction rejected'
      if (msg.includes('rejected') || msg.includes('denied')) {
        setErrorMsg('Transaction cancelled')
      } else if (msg.includes('insufficient')) {
        setErrorMsg(`Insufficient USDC. Need $${priceUsd * quantity}`)
      } else {
        setErrorMsg('Transaction failed')
      }
      setStatus('error')
      return false
    }

    setStatus('confirming')

    // Wait a few seconds for tx to confirm on chain
    await new Promise(r => setTimeout(r, 4000))

    setStatus('verifying')

    // Verify on backend & update inventory
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          item_key: itemKey,
          tx_hash: txHash,
          quantity,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Verification failed')
        setStatus('error')
        return false
      }

      // Update local player state
      if (player && data.items) {
        setPlayer({ ...player, items: data.items })
      }

      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
      return true

    } catch {
      setErrorMsg('Server error during verification')
      setStatus('error')
      return false
    }
  }, [address, writeContractAsync, player, setPlayer])

  const reset = useCallback(() => {
    setStatus('idle')
    setErrorMsg('')
  }, [])

  return { purchase, status, errorMsg, reset }
}
