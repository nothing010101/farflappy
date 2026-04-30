'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { usePlayerStore } from '@/store/playerStore'
import { supabase } from '@/lib/supabase'
import { useChiptune } from '@/hooks/useChiptune'
import type { GameState, GameMode, SessionType } from './GameEngine'
import { MODE_LABELS, MODE_COLORS, MODE_SPEED } from './GameEngine'

const GameEngine = dynamic(() => import('./GameEngine'), { ssr: false })

type GamePhase = 'idle' | 'mode_select' | 'playing' | 'dead'

const MODES: { key: GameMode; desc: string; vip?: boolean }[] = [
  { key: 'easy',   desc: 'Slow speed · Chill vibes' },
  { key: 'medium', desc: 'Normal speed · Classic feel' },
  { key: 'expert', desc: 'Fast speed · Real challenge' },
  { key: 'insane', desc: 'Extreme speed · VIP only', vip: true },
]

export default function GameWrapper({ sessionType = 'casual' }: { sessionType?: SessionType }) {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [gameMode, setGameMode] = useState<GameMode>('medium')
  const [currentState, setCurrentState] = useState<GameState | null>(null)
  const [finalState, setFinalState] = useState<GameState | null>(null)
  const [isPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const startTime = useRef<number>(0)
  const { player } = usePlayerStore()

  const { startMusic, stopMusic, sfxJump, sfxCoin, sfxDeath, sfxItem, sfxScore, toggleMute } = useChiptune()

  const isVip = !!(player?.items?.vip && player.items.vip > 0)

  const handleScoreUpdate = useCallback((state: GameState) => {
    setCurrentState(state)
  }, [])

  const handleGameOver = useCallback(async (state: GameState) => {
    sfxDeath()
    stopMusic()
    setPhase('dead')
    setFinalState(state)
    if (!player) return
    const duration = Math.floor((Date.now() - startTime.current) / 1000)
    await supabase.from('game_sessions').insert({
      player_id: player.id,
      score: state.score,
      pipes_passed: state.pipes,
      coins_collected: state.coins,
      duration_seconds: duration,
      session_type: sessionType,
      game_mode: gameMode,
    })
    await supabase.rpc('upsert_daily_score', {
      p_player_id: player.id,
      p_player_type: player.player_type,
      p_score: state.score,
    })
    await supabase.rpc('upsert_alltime_score', {
      p_player_id: player.id,
      p_player_type: player.player_type,
      p_score: state.score,
    })
    await supabase.from('players').update({
      total_score: player.total_score + state.score,
      games_played: player.games_played + 1,
      flappy_points: player.flappy_points + state.score,
    }).eq('id', player.id)
  }, [player, sfxDeath, stopMusic, sessionType, gameMode])

  const startGame = () => {
    setPhase('playing')
    setFinalState(null)
    startTime.current = Date.now()
    startMusic()
  }

  useEffect(() => { return () => stopMusic() }, [stopMusic])

  // ── IDLE ──
  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-6">
        <div className="pixel-font text-center">
          <div className="text-4xl mb-2">🐦</div>
          <div className="text-farcaster-light text-xs">TAP TO JUMP</div>
          <div className="text-text-muted text-xs mt-1">AVOID THE PIPES</div>
        </div>
        {player && (
          <div className="card p-3 text-center w-full max-w-xs">
            <div className="text-xs text-text-muted">BEST SCORE</div>
            <div className="pixel-font text-pixel text-lg mt-1">{player.total_score.toLocaleString()}</div>
          </div>
        )}
        <button className="btn-primary text-sm px-8 py-4 w-full max-w-xs" onClick={() => setPhase('mode_select')}>
          🎮 PLAY
        </button>
        <button onClick={() => { const m = toggleMute(); setMuted(m) }} className="text-xs text-text-muted hover:text-text transition-colors">
          {muted ? '🔇 Sound OFF' : '🔊 Sound ON'}
        </button>
      </div>
    )
  }

  // ── MODE SELECT ──
  if (phase === 'mode_select') {
    return (
      <div className="flex flex-col h-full p-5 gap-3">
        <div className="pixel-font text-farcaster-light text-center mb-2" style={{ fontSize: 11 }}>
          SELECT DIFFICULTY
        </div>

        <div className="flex flex-col gap-3 flex-1 justify-center">
          {MODES.map(({ key, desc, vip }) => {
            const locked = !!(vip && !isVip)
            const color = MODE_COLORS[key]
            const selected = gameMode === key
            return (
              <button
                key={key}
                onClick={() => { if (!locked) setGameMode(key) }}
                disabled={locked}
                style={{
                  background: selected ? `${color}22` : 'rgba(26,16,53,0.8)',
                  border: `2px solid ${selected ? color : 'rgba(124,58,237,0.3)'}`,
                  padding: '14px 16px',
                  borderRadius: 4,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  opacity: locked ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div className="pixel-font" style={{ fontSize: 11, color: locked ? '#4c1d95' : color }}>
                    {selected ? '▶ ' : ''}{MODE_LABELS[key]} {locked ? '🔒' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', marginTop: 4 }}>
                    {desc}
                  </div>
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: locked ? '#f5d020' : '#4c1d95' }}>
                  {vip ? (isVip ? '✓ VIP' : '$5') : `${MODE_SPEED[key]}x`}
                </div>
              </button>
            )
          })}
        </div>

        {sessionType === 'tournament' && (
          <div className="card p-3 text-xs" style={{ color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.8 }}>
            ⚡ Speed increases during tournament:<br />
            <span style={{ color: '#a78bfa' }}>score 1001</span> → +1.5x &nbsp;
            <span style={{ color: '#f59e0b' }}>3001</span> → +1.8x &nbsp;
            <span style={{ color: '#ef4444' }}>10001+</span> → +2x
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 card text-xs pixel-font py-3 text-farcaster-light cursor-pointer hover:bg-farcaster/10 transition-colors"
            style={{ fontSize: 9 }}
          >
            ← BACK
          </button>
          <button className="btn-primary flex-1 py-3" onClick={startGame} style={{ fontSize: 10 }}>
            START →
          </button>
        </div>
      </div>
    )
  }

  // ── DEAD ──
  if (phase === 'dead' && finalState) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="pixel-font text-red-400 text-sm">GAME OVER</div>

        <div className="card p-4 w-full max-w-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">MODE</span>
            <span className="pixel-font" style={{ fontSize: 9, color: MODE_COLORS[gameMode] }}>
              {MODE_LABELS[gameMode]}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">SCORE</span>
            <span className="pixel-font text-pixel text-lg">{finalState.score.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">PIPES PASSED</span>
            <span className="pixel-font text-farcaster-light text-sm">{finalState.pipes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">COINS</span>
            <span className="pixel-font text-yellow-400 text-sm">{finalState.coins}</span>
          </div>
          {sessionType === 'tournament' && finalState.speedTier > 1 && (
            <div className="flex justify-between items-center">
              <span className="text-text-muted text-xs">MAX SPEED HIT</span>
              <span className="pixel-font text-orange-400 text-sm">
                {['', '1x', '1.5x', '1.8x', '2x'][finalState.speedTier]}
              </span>
            </div>
          )}
          <div className="border-t border-farcaster/20 pt-3 flex justify-between items-center">
            <span className="text-text-muted text-xs">$FLAPPY POINTS</span>
            <span className="pixel-font text-green-400 text-sm">+{finalState.score}</span>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button className="btn-primary flex-1" onClick={() => setPhase('mode_select')}>RETRY</button>
          <button
            onClick={() => setPhase('idle')}
            className="flex-1 card text-xs pixel-font py-3 px-4 text-farcaster-light cursor-pointer hover:bg-farcaster/10 transition-colors"
          >
            MENU
          </button>
        </div>
      </div>
    )
  }

  // ── PLAYING ──
  return (
    <div className="relative w-full h-full">
      {currentState && (
        <div className="absolute top-2 left-2 z-10 bg-black/50 rounded px-2 py-1">
          <span className="pixel-font text-pixel text-xs">{currentState.score.toLocaleString()}</span>
        </div>
      )}
      <button
        onClick={() => { const m = toggleMute(); setMuted(m) }}
        className="absolute top-2 right-2 z-10 bg-black/50 rounded px-2 py-1 text-sm"
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <GameEngine
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        playerItems={player?.items || {}}
        isPaused={isPaused}
        gameMode={gameMode}
        sessionType={sessionType}
        onJump={sfxJump}
        onCoin={sfxCoin}
        onItem={sfxItem}
        onPipe={sfxScore}
      />
    </div>
  )
}
