import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/agent - get leaderboard & info
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

    return NextResponse.json({ tournaments: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

// POST /api/agent - register agent or submit score
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key')
  const body = await req.json()
  const { action } = body

  // Register new agent (no auth required)
  if (action === 'register') {
    const { wallet_address, agent_name } = body

    if (!wallet_address) {
      return NextResponse.json({ error: 'wallet_address required' }, { status: 400 })
    }

    // Upsert player
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

    // Generate API key
    const { data: keyData } = await supabase
      .from('agent_keys')
      .insert({ player_id: player.id })
      .select('api_key')
      .single()

    return NextResponse.json({
      success: true,
      player_id: player.id,
      api_key: keyData?.api_key,
      message: 'Save your API key — it will not be shown again',
    })
  }

  // All other actions require API key auth
  if (!apiKey) {
    return NextResponse.json({ error: 'x-api-key header required' }, { status: 401 })
  }

  const { data: keyRecord } = await supabase
    .from('agent_keys')
    .select('player_id, is_active')
    .eq('api_key', apiKey)
    .single()

  if (!keyRecord || !keyRecord.is_active) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const playerId = keyRecord.player_id

  // Update last used
  await supabase.from('agent_keys').update({ last_used: new Date().toISOString() }).eq('api_key', apiKey)

  // Submit score
  if (action === 'submit_score') {
    const { score, pipes_passed, coins_collected, duration_seconds, tournament_id, attempt_number } = body

    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const { data: player } = await supabase
      .from('players')
      .select('player_type, total_score, games_played, flappy_points')
      .eq('id', playerId)
      .single()

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
    })

    await supabase.rpc('upsert_daily_score', {
      p_player_id: playerId,
      p_player_type: 'agent',
      p_score: score,
    })

    await supabase.from('players').update({
      total_score: player.total_score + score,
      games_played: player.games_played + 1,
    }).eq('id', playerId)

    // Get rank
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('leaderboard_daily')
      .select('*', { count: 'exact', head: true })
      .eq('date', today)
      .eq('player_type', 'agent')
      .gt('score', score)

    return NextResponse.json({
      success: true,
      score,
      rank: (count || 0) + 1,
      message: `Score ${score} submitted. Current rank: #${(count || 0) + 1}`,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
