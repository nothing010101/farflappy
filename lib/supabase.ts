import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type PlayerType = 'human' | 'agent'

export interface Player {
  id: string
  fid: number | null
  wallet_address: string
  username: string | null
  avatar_url: string | null
  player_type: PlayerType
  total_score: number
  games_played: number
  active_days: number
  streak_days: number
  items: Record<string, number>
  flappy_points: number
  created_at: string
}

export interface GameSession {
  id: string
  player_id: string
  score: number
  pipes_passed: number
  coins_collected: number
  items_used: string[]
  duration_seconds: number
  session_type: 'casual' | 'tournament'
  tournament_id: string | null
  attempt_number: number
  created_at: string
}

export interface Tournament {
  id: string
  name: string
  player_type: 'human' | 'agent' | 'both'
  start_time: string
  end_time: string
  entry_fee_usdc: number
  prize_pool_usdc: number
  participant_count: number
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
  contract_address: string | null
  winners: Array<{ wallet: string; rank: number; prize: number }>
}

export interface LeaderboardEntry {
  player_id: string
  score: number
  date: string
  players: {
    username: string
    avatar_url: string
    wallet_address: string
    player_type: PlayerType
    streak_days: number
  }
}
