'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import { usePlayerStore } from '@/store/playerStore'
import { supabase } from '@/lib/supabase'
import type { GameState } from './GameEngine'

const GameEngine = dynamic(() => import('./GameEngine'), { ssr: false })

type GamePhase = 'idle' | 'playing' | 'dead'

export default function GameWrapper() {
  const [phase, setPhase] = useState<GamePhase>('idle')
  const [currentState, setCurrentState] = useState<GameState | null>(null)
  const [finalState, setFinalState] = useState<GameState | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const startTime = useRef<number>(0)
  const { address } = useAccount()
  const { player } = usePlayerStore()

  const handleScoreUpdate = useCallback((state: GameState) => {
    setCurrentState(state)
  }, [])

  const handleGameOver = useCallback(async (state: GameState) => {
    setPhase('dead')
    setFinalState(state)

    if (!player) return

    const duration = Math.floor((Date.now() - startTime.current) / 1000)

    // Save session
    await supabase.from('game_sessions').insert({
      player_id: player.id,
      score: state.score,
      pipes_passed: state.pipes,
      coins_collected: state.coins,
      duration_seconds: duration,
      session_type: 'casual',
    })

    // Upsert daily leaderboard
    await supabase.rpc('upsert_daily_score', {
      p_player_id: player.id,
      p_player_type: player.player_type,
      p_score: state.score,
    })

    // Update player totals
    await supabase.from('players').update({
      total_score: player.total_score + state.score,
      games_played: player.games_played + 1,
      flappy_points: player.flappy_points + Math.floor(state.score / 10),
    }).eq('id', player.id)

  }, [player])

  const startGame = () => {
    setPhase('playing')
    setFinalState(null)
    startTime.current = Date.now()
  }

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6">
        {/* Pixel bird preview */}
        <div className="pixel-font text-center">
          <div className="text-4xl mb-2">🐦</div>
          <div className="text-farcaster-light text-xs leading-relaxed">
            TAP TO JUMP
          </div>
          <div className="text-text-muted text-xs mt-1">
            AVOID THE PIPES
          </div>
        </div>

        {player && (
          <div className="card p-3 text-center w-full max-w-xs">
            <div className="text-xs text-text-muted">BEST SCORE</div>
            <div className="pixel-font text-pixel text-lg mt-1">{player.total_score}</div>
          </div>
        )}

        <button className="btn-primary text-sm px-8 py-4" onClick={startGame}>
          {player ? 'PLAY' : 'CONNECT WALLET FIRST'}
        </button>

        {player && (
          <div className="text-xs text-text-muted text-center">
            <span className="text-farcaster-light">{player.flappy_points}</span> $FLAPPY points earned
          </div>
        )}
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
      {/* Live score overlay */}
      {currentState && (
        <div className="absolute top-2 left-2 z-10 flex gap-2">
          <div className="bg-black/50 rounded px-2 py-1">
            <span className="pixel-font text-pixel text-xs">{currentState.score}</span>
          </div>
        </div>
      )}

      <GameEngine
        onScoreUpdate={handleScoreUpdate}
        onGameOver={handleGameOver}
        playerItems={player?.items || {}}
        isPaused={isPaused}
      />
    </div>
  )
}
