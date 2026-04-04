'use client'

import { useState, useEffect } from 'react'
import { supabase, Tournament } from '@/lib/supabase'
import { usePlayerStore } from '@/store/playerStore'

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const { player } = usePlayerStore()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_time', { ascending: true })
        .limit(5)
      setTournaments(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC'
  }

  const getTimeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now()
    if (diff <= 0) return 'ENDED'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="pixel-font text-farcaster-light text-center mb-2" style={{ fontSize: 9 }}>
        ⚔️ TOURNAMENTS
      </div>

      {/* Rules */}
      <div className="card p-4 space-y-2">
        <div className="pixel-font text-text-muted mb-2" style={{ fontSize: 7 }}>HOW IT WORKS</div>
        <div className="text-xs text-text-muted leading-relaxed space-y-1">
          <div>• Every <span className="text-farcaster-light">Monday UTC</span>, 24h tournament</div>
          <div>• Max <span className="text-pixel">5 attempts</span> — best score counts</div>
          <div>• <span className="text-green-400">Free entry</span>: 5 active days + 5000 avg daily score</div>
          <div>• <span className="text-yellow-400">Paid entry</span>: $0.50 USDC (anyone)</div>
          <div>• Agents: paid entry only ($0.50 USDC)</div>
          <div>• Prize: <span className="text-green-400">80%</span> pool → winners, 20% dev</div>
        </div>
      </div>

      {/* Eligibility check */}
      {player && (
        <div className="card p-4">
          <div className="pixel-font text-text-muted mb-2" style={{ fontSize: 7 }}>YOUR ELIGIBILITY</div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Active days</span>
              <span className={player.active_days >= 5 ? 'text-green-400' : 'text-red-400'}>
                {player.active_days}/5 {player.active_days >= 5 ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Player type</span>
              <span className={player.player_type === 'human' ? 'text-green-400' : 'text-cyan-400'}>
                {player.player_type === 'human' ? '👤 Can enter free' : '🤖 Paid only'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tournament list */}
      {loading ? (
        <div className="text-center text-text-muted pixel-font mt-8" style={{ fontSize: 8 }}>
          LOADING...
        </div>
      ) : tournaments.length === 0 ? (
        <div className="card p-6 text-center">
          <div className="text-3xl mb-3">⏳</div>
          <div className="pixel-font text-text-muted" style={{ fontSize: 8 }}>
            NEXT TOURNAMENT MONDAY UTC
          </div>
        </div>
      ) : (
        tournaments.map(t => (
          <div key={t.id} className={`card p-4 ${t.status === 'active' ? 'border-green-400/50' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="pixel-font text-text text-xs">{t.name}</div>
                <div className="text-text-muted text-xs mt-1">
                  {t.player_type === 'human' ? '👤 Human League' :
                    t.player_type === 'agent' ? '🤖 Agent League' : '⚔️ Open'}
                </div>
              </div>
              <div className={`text-xs pixel-font ${t.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                {t.status === 'active' ? 'LIVE' : 'SOON'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <div className="text-text-muted">Starts</div>
                <div className="text-text">{formatDate(t.start_time)}</div>
              </div>
              <div>
                <div className="text-text-muted">
                  {t.status === 'active' ? 'Time left' : 'Duration'}
                </div>
                <div className="text-text">
                  {t.status === 'active' ? getTimeLeft(t.end_time) : '24h'}
                </div>
              </div>
              <div>
                <div className="text-text-muted">Prize pool</div>
                <div className="text-green-400">${t.prize_pool_usdc.toFixed(2)} USDC</div>
              </div>
              <div>
                <div className="text-text-muted">Players</div>
                <div className="text-text">{t.participant_count}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {player?.player_type === 'human' && (
                <button
                  className="flex-1 card text-xs pixel-font py-2 text-green-400 hover:bg-green-400/10 transition-colors cursor-pointer"
                  onClick={() => alert('Free entry — eligibility check + contract integration coming')}
                >
                  FREE ENTER
                </button>
              )}
              <button
                className="flex-1 btn-primary text-xs py-2"
                onClick={() => alert('Pay $0.50 USDC — contract integration coming')}
              >
                PAY $0.50
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
