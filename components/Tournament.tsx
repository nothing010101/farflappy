'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { supabase, Tournament } from '@/lib/supabase'
import { usePlayerStore } from '@/store/playerStore'
import { useTournament } from '@/hooks/useTournament'

interface TournamentCardProps {
  t: Tournament
  onPlay: (tournamentId: string) => void
}

function TournamentCard({ t, onPlay }: TournamentCardProps) {
  const { player, isLoading: playerLoading } = usePlayerStore()
  const { address } = useAccount()
  const [entering, setEntering] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [attemptCount, setAttemptCount] = useState<number | null>(null)

  const isFree = t.entry_fee_usdc === 0
  const tournamentIdNum = t.contract_tournament_id ?? 0

  const { enterTournament, prizePool, participantCount } = useTournament(tournamentIdNum)

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
    return `${h}h ${m}m left`
  }

  const [alreadyEnteredDB, setAlreadyEnteredDB] = useState(false)
  useEffect(() => {
    if (!player) return
    supabase
      .from('tournament_entries')
      .select('id, attempt_count')
      .eq('tournament_id', t.id)
      .eq('player_id', player.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setAlreadyEnteredDB(true)
          setAttemptCount(data.attempt_count)
        }
      })
  }, [player, t.id])

  const handleFreeEntry = async () => {
    if (!player) {
      setError('Profile not loaded. Wait a moment and try again.')
      return
    }
    setError('')
    setEntering(true)
    try {
      const { error: err } = await supabase.from('tournament_entries').upsert({
        tournament_id: t.id,
        player_id: player.id,
        entry_type: 'free',
        qualified_free: true,
        best_score: 0,
        attempt_count: 0,
      }, { onConflict: 'tournament_id,player_id' })
      if (err) throw err
      setSuccess(true)
      setAlreadyEnteredDB(true)
      setAttemptCount(0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to enter')
    } finally {
      setEntering(false)
    }
  }

  const handlePaidEntry = async () => {
    if (!player) {
      setError('Profile not loaded. Wait a moment and try again.')
      return
    }
    setError('')
    setEntering(true)
    try {
      await enterTournament()
      await supabase.from('tournament_entries').upsert({
        tournament_id: t.id,
        player_id: player.id,
        entry_type: 'paid',
        best_score: 0,
        attempt_count: 0,
      }, { onConflict: 'tournament_id,player_id' })
      setSuccess(true)
      setAlreadyEnteredDB(true)
      setAttemptCount(0)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      if (msg.includes('User rejected') || msg.includes('denied')) {
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

  const isEntered = alreadyEnteredDB || success
  const livePrizePool = t.contract_address ? prizePool : t.prize_pool_usdc
  const liveParticipants = t.contract_address ? participantCount : t.participant_count
  const attemptsLeft = attemptCount !== null ? Math.max(0, 5 - attemptCount) : null
  const attemptsExhausted = attemptsLeft === 0

  const freeButtonLabel = () => {
    if (entering) return 'ENTERING...'
    if (playerLoading) return 'LOADING...'
    return '🎉 JOIN FREE'
  }

  return (
    <div style={{
      background: '#111028',
      border: `1px solid ${t.status === 'active' ? 'rgba(16,185,129,0.5)' : 'rgba(124,58,237,0.3)'}`,
      borderRadius: 4,
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#e2d9f3' }}>
            {t.name}
          </div>
          <div style={{ fontSize: 10, color: '#7c6fa0', marginTop: 4, fontFamily: '"IBM Plex Mono", monospace' }}>
            {t.player_type === 'human' ? '👤 Human League' :
              t.player_type === 'agent' ? '🤖 Agent League' : '⚔️ Open'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{
            fontFamily: '"Press Start 2P", monospace', fontSize: 7,
            color: t.status === 'active' ? '#10b981' : '#f59e0b'
          }}>
            {t.status === 'active' ? '🔴 LIVE' : 'SOON'}
          </span>
          {isFree && (
            <span style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 7,
              color: '#f5d020', background: 'rgba(245,208,32,0.15)',
              padding: '2px 6px', borderRadius: 2,
            }}>
              FREE
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Ends', value: t.status === 'active' ? getTimeLeft(t.end_time) : formatDate(t.start_time) },
          { label: 'Players', value: String(liveParticipants) },
          { label: 'Prize Pool', value: livePrizePool > 0 ? `$${livePrizePool.toFixed(2)}` : 'Sponsored 🎁', color: '#10b981' },
          {
            label: 'Attempts',
            value: attemptsLeft !== null ? `${attemptsLeft}/5 left` : '5 max',
            color: attemptsLeft !== null ? (attemptsLeft <= 1 ? '#ef4444' : attemptsLeft <= 3 ? '#f59e0b' : '#10b981') : undefined,
          },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'rgba(10,6,20,0.6)', padding: '8px 10px', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>{label}</div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: color || '#e2d9f3', marginTop: 4 }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Attempts info */}
      <div style={{
        fontSize: 10, color: '#7c6fa0', marginBottom: 12,
        fontFamily: '"IBM Plex Mono", monospace',
        background: 'rgba(124,58,237,0.08)', padding: '8px 10px', borderRadius: 4,
      }}>
        Best of 5 attempts counts · Speed increases with score
      </div>

      {/* Error */}
      {error && (
        <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace' }}>
          ✗ {error}
        </div>
      )}

      {/* Buttons */}
      {isEntered ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attemptsExhausted ? (
            <div style={{
              textAlign: 'center', padding: '14px',
              fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4,
            }}>
              ✗ NO ATTEMPTS LEFT
            </div>
          ) : (
            <button
              onClick={() => onPlay(t.id)}
              style={{
                width: '100%', background: '#10b981',
                border: 'none', padding: '14px',
                fontFamily: '"Press Start 2P", monospace', fontSize: 10,
                color: '#0f0a1e', cursor: 'pointer', borderRadius: 4,
              }}
            >
              ▶ GO PLAY {attemptsLeft !== null ? `(${attemptsLeft} left)` : ''}
            </button>
          )}
        </div>
      ) : !address ? (
        <div style={{
          textAlign: 'center', padding: '12px', fontSize: 10,
          color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace',
          border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4,
        }}>
          Connect wallet to enter
        </div>
      ) : isFree ? (
        <button
          onClick={handleFreeEntry}
          disabled={entering || playerLoading || !player}
          style={{
            width: '100%',
            background: entering || playerLoading ? '#1a1035' : '#f5d020',
            border: 'none', padding: '14px',
            fontFamily: '"Press Start 2P", monospace', fontSize: 10,
            color: entering || playerLoading ? '#7c6fa0' : '#0f0a1e',
            cursor: entering || playerLoading || !player ? 'not-allowed' : 'pointer',
            borderRadius: 4,
            opacity: !player && !playerLoading ? 0.5 : 1,
          }}
        >
          {freeButtonLabel()}
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {player?.player_type === 'human' && player.active_days >= 5 && (
            <button
              onClick={handleFreeEntry}
              disabled={entering || playerLoading}
              style={{
                width: '100%', background: 'transparent',
                border: '1px solid rgba(16,185,129,0.5)', padding: '12px',
                fontFamily: '"Press Start 2P", monospace', fontSize: 9,
                color: '#10b981', cursor: entering || playerLoading ? 'not-allowed' : 'pointer', borderRadius: 4,
              }}
            >
              FREE (5+ days active)
            </button>
          )}
          <button
            onClick={handlePaidEntry}
            disabled={entering || !t.contract_address || playerLoading || !player}
            style={{
              width: '100%', background: entering ? '#1a1035' : '#7c3aed',
              border: 'none', padding: '14px',
              fontFamily: '"Press Start 2P", monospace', fontSize: 10,
              color: entering ? '#7c6fa0' : 'white',
              cursor: entering || !t.contract_address || !player ? 'not-allowed' : 'pointer', borderRadius: 4,
            }}
          >
            {entering ? 'CONFIRM TX...' : playerLoading ? 'LOADING...' : `PAY $${t.entry_fee_usdc} USDC`}
          </button>
          {!t.contract_address && (
            <div style={{ fontSize: 9, color: '#4c1d95', textAlign: 'center', fontFamily: '"IBM Plex Mono", monospace' }}>
              Contract not yet activated
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TournamentPage({ onPlay }: { onPlay: (tournamentId: string) => void }) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const { player } = usePlayerStore()

  useEffect(() => {
    const fetchTournaments = async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .in('status', ['upcoming', 'active'])
        .order('start_time', { ascending: true })
        .limit(10)
      setTournaments(data || [])
      setLoading(false)
    }
    fetchTournaments()
  }, [])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', textAlign: 'center', marginBottom: 6 }}>
        ⚔️ TOURNAMENTS
      </div>

      <div style={{
        background: 'rgba(245,208,32,0.1)',
        border: '1px solid rgba(245,208,32,0.4)',
        borderRadius: 4, padding: '12px 14px', marginBottom: 14,
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#f5d020', marginBottom: 6 }}>
          🎉 BETA LAUNCH WEEK
        </div>
        <div style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6 }}>
          First tournament is FREE for everyone!<br />
          Prize pool sponsored by the dev.
        </div>
      </div>

      <div style={{
        background: 'rgba(10,6,20,0.8)', border: '1px solid rgba(124,58,237,0.2)',
        borderRadius: 4, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0', marginBottom: 8 }}>
          HOW IT WORKS
        </div>
        {[
          '⚔️  Every Monday UTC — 24h tournament',
          '🎯  Max 5 attempts — best score counts',
          '💰  80% prize pool → winners',
          '⚡  Speed increases as score grows',
        ].map(line => (
          <div key={line} style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', marginBottom: 6 }}>
            {line}
          </div>
        ))}
      </div>

      {player && (
        <div style={{
          background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 4, padding: '10px 14px', marginBottom: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>
            {player.username}
          </span>
          <span style={{ fontSize: 10, color: player.player_type === 'human' ? '#10b981' : '#06b6d4', fontFamily: '"IBM Plex Mono", monospace' }}>
            {player.player_type === 'human' ? '👤 Human' : '🤖 Agent'}
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#7c6fa0', fontFamily: '"Press Start 2P", monospace', fontSize: 8, marginTop: 40 }}>
          LOADING...
        </div>
      ) : tournaments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0' }}>
            NEXT TOURNAMENT MONDAY UTC
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tournaments.map(t => <TournamentCard key={t.id} t={t} onPlay={onPlay} />)}
        </div>
      )}
    </div>
  )
}
