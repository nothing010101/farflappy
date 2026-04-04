'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { supabase, Tournament } from '@/lib/supabase'
import { usePlayerStore } from '@/store/playerStore'
import { useTournament } from '@/hooks/useTournament'

// Wrapper per tournament card yang pakai hook onchain
function TournamentCard({ t }: { t: Tournament }) {
  const { player } = usePlayerStore()
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const tournamentIdNum = t.contract_address
    ? parseInt(t.id.slice(-8), 16) || 1
    : 1

  const { enterTournament, prizePool, participantCount, alreadyEntered, isActive } =
    useTournament(tournamentIdNum)

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC'

  const getTimeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now()
    if (diff <= 0) return 'ENDED'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const handlePaidEntry = async () => {
    setError('')
    setEntering(true)
    try {
      await enterTournament()

      // Record in Supabase
      if (player) {
        await supabase.from('tournament_entries').upsert({
          tournament_id: t.id,
          player_id: player.id,
          entry_type: 'paid',
          best_score: 0,
          attempt_count: 0,
        }, { onConflict: 'tournament_id,player_id' })
      }

      setSuccess(true)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      if (msg.includes('User rejected')) {
        setError('Transaction cancelled')
      } else if (msg.includes('insufficient')) {
        setError('Insufficient USDC balance')
      } else {
        setError('Failed: ' + msg.slice(0, 60))
      }
    } finally {
      setEntering(false)
    }
  }

  const handleFreeEntry = async () => {
    if (!player) return
    setError('')
    setEntering(true)
    try {
      const { error } = await supabase.from('tournament_entries').upsert({
        tournament_id: t.id,
        player_id: player.id,
        entry_type: 'free',
        qualified_free: true,
        best_score: 0,
        attempt_count: 0,
      }, { onConflict: 'tournament_id,player_id' })

      if (error) throw error
      setSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to enter')
    } finally {
      setEntering(false)
    }
  }

  const livePrizePool = t.contract_address ? prizePool : t.prize_pool_usdc
  const liveParticipants = t.contract_address ? participantCount : t.participant_count

  return (
    <div className={`card p-4 ${t.status === 'active' ? 'border-green-400/50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="pixel-font text-text text-xs">{t.name}</div>
          <div className="text-text-muted text-xs mt-1">
            {t.player_type === 'human' ? '👤 Human League' :
              t.player_type === 'agent' ? '🤖 Agent League' : '⚔️ Open'}
          </div>
        </div>
        <div className={`text-xs pixel-font ${t.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
          {t.status === 'active' ? '🔴 LIVE' : 'SOON'}
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
          <div className="text-green-400 pixel-font">${livePrizePool.toFixed(2)} USDC</div>
        </div>
        <div>
          <div className="text-text-muted">Players</div>
          <div className="text-text">{liveParticipants}</div>
        </div>
      </div>

      {/* Attempts info */}
      <div className="text-xs text-text-muted mb-3 bg-black/20 rounded p-2">
        Max <span className="text-pixel">5 attempts</span> — best score counts
      </div>

      {/* Error / Success */}
      {error && (
        <div className="text-red-400 text-xs mb-2 bg-red-400/10 rounded p-2">{error}</div>
      )}
      {success && (
        <div className="text-green-400 text-xs mb-2 bg-green-400/10 rounded p-2">
          ✓ Entered! Go play and submit your score.
        </div>
      )}

      {/* Buttons */}
      {alreadyEntered || success ? (
        <div className="text-center pixel-font text-green-400 py-2" style={{ fontSize: 8 }}>
          ✓ ALREADY ENTERED — GO PLAY!
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Free entry — human only */}
          {player?.player_type === 'human' && t.player_type !== 'agent' && (
            <button
              className="flex-1 card text-xs pixel-font py-2 text-green-400 hover:bg-green-400/10 transition-colors cursor-pointer disabled:opacity-50"
              onClick={handleFreeEntry}
              disabled={entering}
              style={{ fontSize: 8 }}
            >
              {entering ? '...' : 'FREE ENTER'}
            </button>
          )}

          {/* Paid entry */}
          <button
            className="flex-1 btn-primary text-xs py-2 disabled:opacity-50"
            onClick={handlePaidEntry}
            disabled={entering || !t.contract_address}
            style={{ fontSize: 9 }}
          >
            {entering ? 'CONFIRM TX...' : 'PAY $0.50 USDC'}
          </button>
        </div>
      )}

      {/* No contract yet */}
      {!t.contract_address && (
        <div className="text-text-muted text-center mt-2" style={{ fontSize: 7 }}>
          Tournament not yet activated onchain
        </div>
      )}
    </div>
  )
}

export default function TournamentPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const { player } = usePlayerStore()
  const { address } = useAccount()

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

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="pixel-font text-farcaster-light text-center mb-2" style={{ fontSize: 9 }}>
        ⚔️ TOURNAMENTS
      </div>

      {/* Rules */}
      <div className="card p-4 space-y-1">
        <div className="pixel-font text-text-muted mb-2" style={{ fontSize: 7 }}>HOW IT WORKS</div>
        <div className="text-xs text-text-muted leading-relaxed space-y-1">
          <div>• Every <span className="text-farcaster-light">Monday UTC</span>, 24h tournament</div>
          <div>• Max <span className="text-pixel">5 attempts</span> — best score counts</div>
          <div>• <span className="text-green-400">Free entry</span>: 5 active days + 5000 avg score</div>
          <div>• <span className="text-yellow-400">Paid entry</span>: $0.50 USDC (anyone)</div>
          <div>• Agents: paid entry only ($0.50 USDC)</div>
          <div>• Prize: <span className="text-green-400">80%</span> pool → winners, 20% dev</div>
        </div>
      </div>

      {/* Wallet check */}
      {!address && (
        <div className="card p-4 text-center">
          <div className="text-text-muted text-xs">Connect wallet to enter tournaments</div>
        </div>
      )}

      {/* Eligibility */}
      {player && (
        <div className="card p-3">
          <div className="pixel-font text-text-muted mb-2" style={{ fontSize: 7 }}>YOUR STATUS</div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Active days</span>
            <span className={player.active_days >= 5 ? 'text-green-400' : 'text-red-400'}>
              {player.active_days}/5 {player.active_days >= 5 ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-text-muted">Type</span>
            <span className={player.player_type === 'human' ? 'text-green-400' : 'text-cyan-400'}>
              {player.player_type === 'human' ? '👤 Can enter free' : '🤖 Paid only'}
            </span>
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
        tournaments.map(t => <TournamentCard key={t.id} t={t} />)
      )}
    </div>
  )
}
