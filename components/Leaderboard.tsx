'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type LeagueType = 'human' | 'agent'

interface Entry {
  score: number
  players: {
    username: string
    avatar_url: string | null
    wallet_address: string
    streak_days: number
  }
}

export default function Leaderboard() {
  const [league, setLeague] = useState<LeagueType>('human')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('leaderboard_daily')
        .select('score, players(username, avatar_url, wallet_address, streak_days)')
        .eq('date', today)
        .eq('player_type', league)
        .order('score', { ascending: false })
        .limit(50)

      setEntries((data as unknown as Entry[]) || [])
      setLoading(false)
    }
    fetch()
  }, [league])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="h-full flex flex-col">
      {/* League toggle */}
      <div className="flex border-b border-farcaster/20">
        {(['human', 'agent'] as LeagueType[]).map(l => (
          <button
            key={l}
            onClick={() => setLeague(l)}
            className={`flex-1 py-3 pixel-font transition-colors ${
              league === l
                ? 'text-farcaster-light border-b-2 border-farcaster'
                : 'text-text-muted'
            }`}
            style={{ fontSize: 9 }}
          >
            {l === 'human' ? '👤 HUMAN' : '🤖 AGENT'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center text-text-muted pixel-font mt-8" style={{ fontSize: 8 }}>
            LOADING...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center text-text-muted pixel-font mt-8" style={{ fontSize: 8 }}>
            NO SCORES TODAY
          </div>
        ) : (
          entries.map((entry, i) => (
            <div
              key={i}
              className={`card p-3 flex items-center gap-3 ${
                i === 0 ? 'border-yellow-400/50' : ''
              }`}
            >
              <span className="text-lg w-6 text-center">
                {i < 3 ? medals[i] : `${i + 1}`}
              </span>

              <div className="flex-1 min-w-0">
                <div className="pixel-font text-xs text-text truncate">
                  {entry.players?.username || 'anon'}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {entry.players?.wallet_address?.slice(0, 6)}...
                  {entry.players?.streak_days > 1 && (
                    <span className="ml-2 text-orange-400">🔥{entry.players.streak_days}</span>
                  )}
                </div>
              </div>

              <div className="pixel-font text-pixel text-sm">
                {entry.score.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
