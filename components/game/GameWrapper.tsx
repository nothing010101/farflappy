'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import { usePlayerStore } from '@/store/playerStore'
import { supabase } from '@/lib/supabase'
import { useChiptune } from '@/hooks/useChiptune'
import type { GameState } from './GameEngine'

const GameEngine = dynamic(() => import('./GameEngine'), { ssr: false })

type GamePhase = 'idle' | 'playing' | 'dead'

export default function GameWrapper() {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [currentState, setCurrentState] = useState<GameState | null>(null)
  const [finalState, setFinalState] = useState<GameState | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [muted, setMuted] = useState(false)
  const startTime = useRef<number>(0)
  const musicCleanup = useRef<(() => void) | undefined>()
  const { player } = usePlayerStore()

  const {
    startMusic,
    stopMusic,
    sfxJump,
    sfxCoin,
    sfxDeath,
    sfxItem,
    sfxScore,
    toggleMute,
  } = useChiptune()

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
      session_type: 'casual',
    })

    await supabase.rpc('upsert_daily_score', {
      p_player_id: player.id,
      p_player_type: player.player_type,
      p_score: state.score,
    })

    await supabase.from('players').update({
      total_score: player.total_score + state.score,
      games_played: player.games_played + 1,
      flappy_points: player.flappy_points + Math.floor(state.score / 10),
    }).eq('id', player.id)

  }, [player, sfxDeath, stopMusic])

  const startGame = () => {
    setPhase('playing')
    setFinalState(null)
    startTime.current = Date.now()
    const cleanup = startMusic()
    if (cleanup) musicCleanup.current = cleanup
  }

  const handleToggleMute = () => {
    const nowMuted = toggleMute()
    setMuted(nowMuted)
  }

  // Cleanup music on unmount
  useEffect(() => {
    return () => {
      stopMusic()
    }
  }, [stopMusic])

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        <div className="pixel-font text-center">
          <div className="text-4xl mb-2">🐦</div>
          <div className="text-farcaster-light text-xs leading-relaxed">TAP TO JUMP</div>
          <div className="text-text-muted text-xs mt-1">AVOID THE PIPES</div>
        </div>

        {player && (
          <div className="card p-3 text-center w-full max-w-xs">
            <div className="text-xs text-text-muted">BEST SCORE</div>
            <div className="pixel-font text-pixel text-lg mt-1">{player.total_score}</div>
          </div>
        )}

        <button className="btn-primary text-sm px-8 py-4" onClick={startGame}>
          {player ? '🎮 PLAY' : '🎮 PLAY (GUEST)'}
        </button>

        {player && (
          <div className="text-xs text-text-muted text-center">
            <span className="text-farcaster-light">{player.flappy_points}</span> $FLAPPY points earned
          </div>
        )}

        {/* Mute toggle on idle screen */}
        <button
          onClick={handleToggleMute}
          className="text-xs text-text-muted hover:text-text transition-colors"
        >
          {muted ? '🔇 Sound OFF' : '🔊 Sound ON'}
        </button>
      </div>
    )
  }

  if (phase === 'dead' && finalState) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <div className="pixel-font text-red-400 text-sm">GAME OVER</div>

        <div className="card p-4 w-full max-w-xs space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">SCORE</span>
            <span className="pixel-font text-pixel">{finalState.score}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">PIPES</span>
            <span className="pixel-font text-farcaster-light text-sm">{finalState.pipes}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-muted text-xs">COINS</span>
            <span className="pixel-font text-yellow-400 text-sm">{finalState.coins}</span>
          </div>
          <div className="border-t border-farcaster/20 pt-3 flex justify-between items-center">
            <span className="text-text-muted text-xs">$FLAPPY EARNED</span>
            <span className="pixel-font text-green-400 text-sm">
              +{Math.floor(finalState.score / 10)}
            </span>
          </div>
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <button className="btn-primary flex-1" onClick={startGame}>
            RETRY
          </button>
          <button
            className="flex-1 card text-xs pixel-font py-3 px-4 text-farcaster-light cursor-pointer hover:bg-farcaster/10 transition-colors"
            onClick={() => setPhase('idle')}
          >
            MENU
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Score overlay */}
      {currentState && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-black/50 rounded px-2 py-1">
            <span className="pixel-font text-pixel text-xs">{currentState.score}</span>
          </div>
        </div>
      )}

      {/* Mute button */}
      <button
        onClick={handleToggleMute}
        className="absolute top-2 right-2 z-10 bg-black/50 rounded px-2 py-1 text-sm"
        style={{ lineHeight: 1 }}
      >
        {muted ? '🔇' : '🔊'}
      </button>

      <GameEngine
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        playerItems={player?.items || {}}
        isPaused={isPaused}
        onJump={sfxJump}
        onCoin={sfxCoin}
        onItem={sfxItem}
        onPipe={sfxScore}
      />
    </div>
  )
}
