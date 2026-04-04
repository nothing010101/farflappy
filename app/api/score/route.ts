import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { wallet_address, score, pipes_passed, coins_collected, duration_seconds, tournament_id, attempt_number } = body

    if (!wallet_address || typeof score !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get player
    const { data: player } = await supabase
      .from('players')
      .select('id, player_type, total_score, games_played, flappy_points')
      .eq('wallet_address', wallet_address.toLowerCase())
      .single()

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }

    // Save session
    await supabase.from('game_sessions').insert({
      player_id: player.id,
      score,
      pipes_passed: pipes_passed || 0,
      coins_collected: coins_collected || 0,
      duration_seconds: duration_seconds || 0,
      session_type: tournament_id ? 'tournament' : 'casual',
      tournament_id: tournament_id || null,
      attempt_number: attempt_number || 1,
    })

    // Update daily leaderboard
    await supabase.rpc('upsert_daily_score', {
      p_player_id: player.id,
      p_player_type: player.player_type,
      p_score: score,
    })

    // Update player totals
    const newFlappyPoints = player.flappy_points + Math.floor(score / 10)
    await supabase.from('players').update({
      total_score: player.total_score + score,
      games_played: player.games_played + 1,
      flappy_points: newFlappyPoints,
    }).eq('id', player.id)

    // Handle tournament best score
    if (tournament_id) {
      const { data: entry } = await supabase
        .from('tournament_entries')
        .select('best_score, attempt_count')
        .eq('tournament_id', tournament_id)
        .eq('player_id', player.id)
        .single()

      if (entry) {
        await supabase.from('tournament_entries').update({
          best_score: Math.max(entry.best_score, score),
          attempt_count: entry.attempt_count + 1,
        }).eq('tournament_id', tournament_id).eq('player_id', player.id)
      }
    }

    return NextResponse.json({
      success: true,
      flappy_points: newFlappyPoints,
      estimated_tokens: Math.floor(newFlappyPoints / 10),
    })

  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
