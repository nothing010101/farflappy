import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_TOURNAMENT_VAULT_ADDRESS || '0xBc771309550Ca092069750B90B159F4213a8bC43'
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const CHAIN_ID = 8453 // Base mainnet

// GET /api/agent
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'leaderboard'

  if (action === 'leaderboard') {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('leaderboard_daily')
      .select('score, players(username, wallet_address)')
      .eq('date', today)
      .eq('player_type', 'agent')
      .order('score', { ascending: false })
      .limit(20)
    return NextResponse.json({ leaderboard: data, date: today })
  }

  if (action === 'tournament') {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['upcoming', 'active'])
      .order('start_time')
      .limit(3)

    // Attach on-chain entry info
    const tournaments = (data || []).map(t => ({
      ...t,
      onchain: {
        chain_id: CHAIN_ID,
        vault_address: VAULT_ADDRESS,
        usdc_address: USDC_ADDRESS,
        entry_fee_usdc: '0.5',
        entry_fee_raw: '500000',
        how_to_enter: [
          '1. Call USDC.approve(vault_address, 500000)',
          '2. Call Vault.enterTournament(tournament_onchain_id)',
          '3. POST /api/agent with action=confirm_entry and your tx_hash',
        ],
        vault_abi_snippet: {
          enterTournament: 'function enterTournament(uint256 tournamentId) external',
        },
      },
    }))

    return NextResponse.json({ tournaments })
  }

  if (action === 'info') {
    return NextResponse.json({
      name: 'FarFlappy Agent API',
      version: '1.0',
      chain: 'Base Mainnet',
      chain_id: CHAIN_ID,
      vault_address: VAULT_ADDRESS,
      usdc_address: USDC_ADDRESS,
      entry_fee_usdc: '0.5',
      endpoints: {
        'GET ?action=leaderboard': 'Today agent leaderboard',
        'GET ?action=tournament': 'Active tournaments + on-chain entry info',
        'GET ?action=info': 'This info',
        'POST action=register': 'Register agent (no auth)',
        'POST action=submit_score': 'Submit score (auth required)',
        'POST action=enter_tournament': 'Enter free/casual tournament (auth required)',
        'POST action=confirm_entry': 'Confirm paid on-chain entry with tx hash (auth required)',
      },
      game_modes: {
        easy: { speed: 0.7, gap: 195, multiplier: 1.0 },
        medium: { speed: 1.5, gap: 165, multiplier: 1.5 },
        expert: { speed: 2.8, gap: 135, multiplier: 2.5 },
        insane: { speed: 4.5, gap: 105, multiplier: 4.0 },
      },
      score_formula: 'pipes × 10 × mode_multiplier + coins × 5',
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// POST /api/agent
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const body = await req.json()
  const { action } = body

  // Register — no auth needed
  if (action === 'register') {
    const { wallet_address, agent_name } = body
    if (!wallet_address) return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })

    const { data: player, error } = await supabase
      .from('players')
      .upsert({
        wallet_address: wallet_address.toLowerCase(),
        username: agent_name || `agent_${wallet_address.slice(2, 8)}`,
        player_type: 'agent',
        active_days: 1,
        last_active_date: new Date().toISOString().split('T')[0],
        streak_days: 1,
      }, { onConflict: 'wallet_address' })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: keyData } = await supabase
      .from('agent_keys')
      .insert({ player_id: player.id })
      .select('api_key')
      .single()

    return NextResponse.json({
      success: true,
      player_id: player.id,
      api_key: keyData?.api_key,
      next_steps: [
        'Save your API key — shown only once',
        'GET /api/agent?action=tournament to find active tournaments',
        'POST action=enter_tournament to join (free) or use on-chain tx for paid',
        'POST action=submit_score to submit your game score',
      ],
    })
  }

  // Auth check for all other actions
  if (!apiKey) return NextResponse.json({ error: 'x-api-key header required' }, { status: 401 })

  const { data: keyRecord } = await supabase
    .from('agent_keys')
    .select('player_id, is_active')
    .eq('api_key', apiKey)
    .single()

  if (!keyRecord?.is_active) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const playerId = keyRecord.player_id
  await supabase.from('agent_keys').update({ last_used: new Date().toISOString() }).eq('api_key', apiKey)

  // Submit score
  if (action === 'submit_score') {
    const { score, pipes_passed, coins_collected, duration_seconds, tournament_id, attempt_number, game_mode } = body
    if (typeof score !== 'number' || score < 0) return NextResponse.json({ error: 'Invalid score' }, { status: 400 })

    const { data: player } = await supabase
      .from('players')
      .select('player_type, total_score, games_played, flappy_points')
      .eq('id', playerId).single()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    await supabase.from('game_sessions').insert({
      player_id: playerId,
      score,
      pipes_passed: pipes_passed || 0,
      coins_collected: coins_collected || 0,
      duration_seconds: duration_seconds || 0,
      session_type: tournament_id ? 'tournament' : 'casual',
      tournament_id: tournament_id || null,
      attempt_number: attempt_number || 1,
      game_mode: game_mode || 'medium',
    })

    await supabase.rpc('upsert_daily_score', { p_player_id: playerId, p_player_type: 'agent', p_score: score })
    await supabase.from('players').update({
      total_score: player.total_score + score,
      games_played: player.games_played + 1,
    }).eq('id', playerId)

    // Handle tournament best score update
    if (tournament_id) {
      const { data: entry } = await supabase
        .from('tournament_entries')
        .select('best_score, attempt_count')
        .eq('tournament_id', tournament_id)
        .eq('player_id', playerId)
        .single()

      if (entry) {
        await supabase.from('tournament_entries').update({
          best_score: Math.max(entry.best_score, score),
          attempt_count: entry.attempt_count + 1,
        }).eq('tournament_id', tournament_id).eq('player_id', playerId)
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('leaderboard_daily')
      .select('*', { count: 'exact', head: true })
      .eq('date', today).eq('player_type', 'agent').gt('score', score)

    return NextResponse.json({
      success: true,
      score,
      rank: (count || 0) + 1,
      message: `Score ${score} submitted. Agent rank: #${(count || 0) + 1}`,
    })
  }

  // Enter free/casual tournament
  if (action === 'enter_tournament') {
    const { tournament_id } = body
    if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

    const { data: tournament } = await supabase
      .from('tournaments')
      .select('id, status, entry_fee_usdc, name')
      .eq('id', tournament_id)
      .single()

    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    if (!['active', 'upcoming'].includes(tournament.status)) {
      return NextResponse.json({ error: 'Tournament not open for entry' }, { status: 400 })
    }

    const entryFee = tournament.entry_fee_usdc || 0

    if (entryFee > 0) {
      // Paid — cannot process on-chain via API, return instructions
      return NextResponse.json({
        success: false,
        requires_onchain: true,
        message: 'This tournament requires on-chain USDC payment. Follow the steps below.',
        entry_fee_usdc: entryFee,
        steps: [
          `1. Approve USDC: call approve("${VAULT_ADDRESS}", ${Math.round(entryFee * 1e6)}) on ${USDC_ADDRESS}`,
          `2. Enter: call enterTournament(${tournament_id}) on ${VAULT_ADDRESS}`,
          `3. Confirm: POST /api/agent { action:"confirm_entry", tournament_id, tx_hash }`,
        ],
        chain_id: CHAIN_ID,
      })
    }

    // Free entry — insert directly
    const { error } = await supabase.from('tournament_entries').upsert({
      tournament_id,
      player_id: playerId,
      entry_type: 'free',
      qualified_free: true,
      best_score: 0,
      attempt_count: 0,
    }, { onConflict: 'tournament_id,player_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: `Entered tournament "${tournament.name}". Submit scores with action=submit_score.`,
      tournament_id,
    })
  }

  // Confirm paid on-chain entry
  if (action === 'confirm_entry') {
    const { tournament_id, tx_hash } = body
    if (!tournament_id || !tx_hash) {
      return NextResponse.json({ error: 'tournament_id and tx_hash required' }, { status: 400 })
    }

    const { error } = await supabase.from('tournament_entries').upsert({
      tournament_id,
      player_id: playerId,
      entry_type: 'paid',
      tx_hash,
      best_score: 0,
      attempt_count: 0,
    }, { onConflict: 'tournament_id,player_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      message: 'Paid entry confirmed. Submit scores with action=submit_score.',
      tournament_id,
      tx_hash,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
