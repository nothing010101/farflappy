'use client'

    import { useState, useEffect, useCallback } from 'react'
    import { useAccount } from 'wagmi'
    import { supabase, Tournament } from '@/lib/supabase'
    import { usePlayerStore } from '@/store/playerStore'
    import { useTournament } from '@/hooks/useTournament'

    interface RankEntry {
      best_score: number
      attempt_count: number
      prize_won_usdc?: number
      rank?: number
      players: {
        username: string
        wallet_address: string
        player_type: string
      }
    }

    interface TournamentCardProps {
      t: Tournament
      onPlay: (tournamentId: string) => void
      onRefresh: () => void
    }

    function TournamentCard({ t, onPlay, onRefresh }: TournamentCardProps) {
      const { player, isLoading: playerLoading } = usePlayerStore()
      const { address } = useAccount()
      const [entering, setEntering] = useState(false)
      const [error, setError] = useState('')
      const [success, setSuccess] = useState(false)
      const [attemptCount, setAttemptCount] = useState<number | null>(null)
      const [realPlayerCount, setRealPlayerCount] = useState<number>(t.participant_count)
      const [showLeaderboard, setShowLeaderboard] = useState(t.status === 'completed')
      const [rankings, setRankings] = useState<RankEntry[]>([])
      const [rankingsLoading, setRankingsLoading] = useState(false)

      const isFree = t.entry_fee_usdc === 0
      const isCompleted = t.status === 'completed'
      const tournamentIdNum = t.contract_tournament_id ?? 0

      const { enterTournament, prizePool, participantCount: onChainParticipantCount } = useTournament(tournamentIdNum)

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

      const fetchRealCount = useCallback(async () => {
        const { count } = await supabase
          .from('tournament_entries')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', t.id)
        if (count !== null) setRealPlayerCount(count)
      }, [t.id])

      const fetchRankings = useCallback(async () => {
        setRankingsLoading(true)
        const { data } = await supabase
          .from('tournament_entries')
          .select('best_score, attempt_count, prize_won_usdc, rank, players(username, wallet_address, player_type)')
          .eq('tournament_id', t.id)
          .order('best_score', { ascending: false })
          .limit(50)
        setRankings((data as unknown as RankEntry[]) || [])
        setRankingsLoading(false)
      }, [t.id])

      const [alreadyEnteredDB, setAlreadyEnteredDB] = useState(false)
      useEffect(() => {
        fetchRealCount()
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
      }, [player, t.id, fetchRealCount])

      useEffect(() => {
        if (showLeaderboard) fetchRankings()
      }, [showLeaderboard, fetchRankings])

      const handleFreeEntry = async () => {
        if (!player) { setError('Profile not loaded. Wait a moment and try again.'); return }
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
          await fetchRealCount()
          onRefresh()
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Failed to enter')
        } finally {
          setEntering(false)
        }
      }

      const handlePaidEntry = async () => {
        if (!player) { setError('Profile not loaded. Wait a moment and try again.'); return }
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
          await fetchRealCount()
          onRefresh()
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Transaction failed'
          if (msg.includes('User rejected') || msg.includes('denied')) setError('Transaction cancelled')
          else if (msg.includes('insufficient')) setError('Insufficient USDC balance')
          else setError('Failed: ' + msg.slice(0, 60))
        } finally {
          setEntering(false)
        }
      }

      const isEntered = alreadyEnteredDB || success
      const livePrizePool = t.contract_address ? prizePool : t.prize_pool_usdc
      const liveParticipants = t.contract_address ? onChainParticipantCount : realPlayerCount
      const attemptsLeft = attemptCount !== null ? Math.max(0, 5 - attemptCount) : null
      const attemptsExhausted = attemptsLeft === 0
      const medals = ['🥇', '🥈', '🥉']

      const freeButtonLabel = () => {
        if (entering) return 'ENTERING...'
        if (playerLoading) return 'LOADING...'
        return '🎉 JOIN FREE'
      }

      return (
        <div style={{
          background: '#111028',
          border: `1px solid ${isCompleted ? 'rgba(245,208,32,0.4)' : t.status === 'active' ? 'rgba(16,185,129,0.5)' : 'rgba(124,58,237,0.3)'}`,
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
              {isCompleted ? (
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#f5d020', background: 'rgba(245,208,32,0.12)', padding: '2px 6px', borderRadius: 2 }}>
                  ✓ ENDED
                </span>
              ) : (
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: t.status === 'active' ? '#10b981' : '#f59e0b' }}>
                  {t.status === 'active' ? '🔴 LIVE' : 'SOON'}
                </span>
              )}
              {isFree && !isCompleted && (
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#f5d020', background: 'rgba(245,208,32,0.15)', padding: '2px 6px', borderRadius: 2 }}>
                  FREE
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { label: isCompleted ? 'Ended' : 'Ends', value: isCompleted ? formatDate(t.end_time) : (t.status === 'active' ? getTimeLeft(t.end_time) : formatDate(t.start_time)) },
              { label: 'Players', value: String(liveParticipants) },
              { label: 'Prize Pool', value: livePrizePool > 0 ? `$${livePrizePool.toFixed(2)}` : 'Sponsored 🎁', color: '#10b981' },
              isCompleted
                ? { label: 'Per Winner', value: '$10.00', color: '#f5d020' }
                : { label: 'Attempts', value: attemptsLeft !== null ? `${attemptsLeft}/5 left` : '5 max', color: attemptsLeft !== null ? (attemptsLeft <= 1 ? '#ef4444' : attemptsLeft <= 3 ? '#f59e0b' : '#10b981') : undefined },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(10,6,20,0.6)', padding: '8px 10px', borderRadius: 4 }}>
                <div style={{ fontSize: 9, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>{label}</div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: color || '#e2d9f3', marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(124,58,237,0.2)', marginBottom: 12 }}>
            {!isCompleted && (
              <button
                onClick={() => setShowLeaderboard(false)}
                style={{
                  flex: 1, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: '"Press Start 2P", monospace', fontSize: 8,
                  color: !showLeaderboard ? '#a78bfa' : '#4c1d95',
                  borderBottom: !showLeaderboard ? '2px solid #7c3aed' : '2px solid transparent',
                }}
              >PLAY</button>
            )}
            <button
              onClick={() => setShowLeaderboard(true)}
              style={{
                flex: 1, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 8,
                color: showLeaderboard ? '#a78bfa' : '#4c1d95',
                borderBottom: showLeaderboard ? '2px solid #7c3aed' : '2px solid transparent',
              }}
            >{isCompleted ? '🏆 FINAL RESULTS' : '🏆 RANKS'}</button>
          </div>

          {/* Leaderboard / Final Results */}
          {showLeaderboard ? (
            <div>
              {/* Completed banner */}
              {isCompleted && (
                <div style={{
                  background: 'linear-gradient(90deg, rgba(245,208,32,0.1), rgba(124,58,237,0.1))',
                  border: '1px solid rgba(245,208,32,0.3)',
                  borderRadius: 4, padding: '10px 12px', marginBottom: 10, textAlign: 'center',
                }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#f5d020', marginBottom: 4 }}>
                    🎉 TOURNAMENT COMPLETE
                  </div>
                  <div style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>
                    Top 5 players each won <span style={{ color: '#10b981' }}>$10.00 USDC</span>
                  </div>
                </div>
              )}

              {rankingsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}>
                  LOADING...
                </div>
              ) : rankings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}>
                  NO SCORES YET
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {rankings.map((entry, i) => {
                    const isMe = entry.players?.wallet_address === address
                    const isWinner = isCompleted && (entry.prize_won_usdc ?? 0) > 0
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          background: isWinner ? 'rgba(245,208,32,0.08)' : isMe ? 'rgba(124,58,237,0.15)' : 'rgba(10,6,20,0.6)',
                          border: isWinner ? '1px solid rgba(245,208,32,0.35)' : isMe ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(124,58,237,0.1)',
                          padding: '8px 10px', borderRadius: 4,
                        }}
                      >
                        <span style={{ width: 20, textAlign: 'center', fontSize: i < 3 ? 14 : 10, fontFamily: '"Press Start 2P", monospace', color: '#4c1d95' }}>
                          {i < 3 ? medals[i] : `${i + 1}`}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: isWinner ? '#f5d020' : isMe ? '#a78bfa' : '#e2d9f3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.players?.username || 'anon'}{isMe ? ' (you)' : ''}
                          </div>
                          <div style={{ fontSize: 9, color: '#4c1d95', marginTop: 2, fontFamily: '"IBM Plex Mono", monospace' }}>
                            {entry.attempt_count} attempt{entry.attempt_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: i === 0 ? '#f5d020' : i === 1 ? '#9ca3af' : i === 2 ? '#c2773a' : '#e2d9f3' }}>
                            {entry.best_score > 0 ? entry.best_score.toLocaleString() : '—'}
                          </div>
                          {isWinner && (
                            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '2px 5px', borderRadius: 2 }}>
                              +$10 USDC
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {!isCompleted && (
                <button
                  onClick={fetchRankings}
                  style={{
                    width: '100%', marginTop: 10, padding: '8px',
                    background: 'none', border: '1px solid rgba(124,58,237,0.2)',
                    fontFamily: '"Press Start 2P", monospace', fontSize: 7,
                    color: '#4c1d95', cursor: 'pointer', borderRadius: 4,
                  }}
                >↻ REFRESH</button>
              )}
            </div>
          ) : (
            /* Action view */
            <div>
              <div style={{ fontSize: 10, color: '#7c6fa0', marginBottom: 12, fontFamily: '"IBM Plex Mono", monospace', background: 'rgba(124,58,237,0.08)', padding: '8px 10px', borderRadius: 4 }}>
                Best of 5 attempts counts · Speed increases with score
              </div>

              {error && (
                <div style={{ fontSize: 10, color: '#ef4444', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace' }}>
                  ✗ {error}
                </div>
              )}

              {isEntered ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attemptsExhausted ? (
                    <div style={{ textAlign: 'center', padding: '14px', fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4 }}>
                      ✗ NO ATTEMPTS LEFT
                    </div>
                  ) : (
                    <button
                      onClick={() => onPlay(t.id)}
                      style={{ width: '100%', background: '#10b981', border: 'none', padding: '14px', fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#0f0a1e', cursor: 'pointer', borderRadius: 4 }}
                    >
                      ▶ GO PLAY {attemptsLeft !== null ? `(${attemptsLeft} left)` : ''}
                    </button>
                  )}
                </div>
              ) : !address ? (
                <div style={{ textAlign: 'center', padding: '12px', fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4 }}>
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
                    borderRadius: 4, opacity: !player && !playerLoading ? 0.5 : 1,
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
                      style={{ width: '100%', background: 'transparent', border: '1px solid rgba(16,185,129,0.5)', padding: '12px', fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#10b981', cursor: entering || playerLoading ? 'not-allowed' : 'pointer', borderRadius: 4 }}
                    >
                      FREE (5+ days active)
                    </button>
                  )}
                  <button
                    onClick={handlePaidEntry}
                    disabled={entering || !t.contract_address || playerLoading || !player}
                    style={{ width: '100%', background: entering ? '#1a1035' : '#7c3aed', border: 'none', padding: '14px', fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: entering ? '#7c6fa0' : 'white', cursor: entering || !t.contract_address || !player ? 'not-allowed' : 'pointer', borderRadius: 4 }}
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
          )}
        </div>
      )
    }

    export default function TournamentPage({ onPlay }: { onPlay: (tournamentId: string) => void }) {
      const [tournaments, setTournaments] = useState<Tournament[]>([])
      const [loading, setLoading] = useState(true)
      const { player } = usePlayerStore()

      const fetchTournaments = useCallback(async () => {
        const { data } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['upcoming', 'active', 'completed'])
          .order('start_time', { ascending: false })
          .limit(10)
        setTournaments(data || [])
        setLoading(false)
      }, [])

      useEffect(() => {
        fetchTournaments()
        const interval = setInterval(fetchTournaments, 30000)
        return () => clearInterval(interval)
      }, [fetchTournaments])

      return (
        <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', textAlign: 'center', marginBottom: 6 }}>
            ⚔️ TOURNAMENTS
          </div>

          <div style={{ background: 'rgba(245,208,32,0.1)', border: '1px solid rgba(245,208,32,0.4)', borderRadius: 4, padding: '12px 14px', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#f5d020', marginBottom: 6 }}>
              🎉 BETA LAUNCH WEEK
            </div>
            <div style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6 }}>
              First tournament is FREE for everyone!<br />
              Prize pool sponsored by the dev.
            </div>
          </div>

          <div style={{ background: 'rgba(10,6,20,0.8)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4, padding: '12px 14px', marginBottom: 14 }}>
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
            <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 4, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}>
                NO TOURNAMENTS YET
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tournaments.map(tournament => (
                <TournamentCard
                  key={tournament.id}
                  t={tournament}
                  onPlay={onPlay}
                  onRefresh={fetchTournaments}
                />
              ))}
            </div>
          )}
        </div>
      )
    }
  