'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Pipe {
  x: number
  topHeight: number
  gap: number
  passed: boolean
  hasCoinChain: boolean
}

interface Coin {
  x: number
  y: number
  collected: boolean
}

interface Item {
  x: number
  y: number
  type: 'shield' | 'flash' | 'slow' | 'double' | 'magnet' | 'extralife'
  collected: boolean
}

interface ActiveEffect {
  type: string
  endsAt: number
}

export type GameMode = 'normal' | 'degen' | 'extreme' | 'insane'
export type SessionType = 'casual' | 'tournament'

export interface GameState {
  score: number
  pipes: number
  coins: number
  isAlive: boolean
  activeEffects: ActiveEffect[]
  speedTier: number
}

interface GameEngineProps {
  onScoreUpdate: (state: GameState) => void
  onGameOver: (finalState: GameState) => void
  playerItems: Record<string, number>
  isPaused: boolean
  gameMode: GameMode
  sessionType: SessionType
  onJump?: () => void
  onCoin?: () => void
  onItem?: () => void
  onPipe?: () => void
}

// Score multipliers per mode
export const MODE_MULTIPLIERS: Record<GameMode, number> = {
  normal: 1,
  degen: 3,
  extreme: 5,
  insane: 10,
}

export const MODE_LABELS: Record<GameMode, string> = {
  normal: 'NORMAL',
  degen: 'DEGEN',
  extreme: 'EXTREME',
  insane: 'INSANE',
}

export const MODE_COLORS: Record<GameMode, string> = {
  normal: '#a78bfa',
  degen: '#f59e0b',
  extreme: '#ef4444',
  insane: '#f5d020',
}

const GRAVITY = 0.35
const JUMP_FORCE = -7
const PIPE_WIDTH = 52
const PIPE_GAP_BASE = 165     // slightly wider than before
const PIPE_GAP_SLOW = 210     // much wider when slow active
const PIPE_SPEED_BASE = 2.2
const BIRD_X = 80
const BIRD_SIZE = 28
const COIN_SIZE = 10
const ITEM_SIZE = 18
const SCORE_PER_PIPE = 10

// Tournament speed tiers (based on raw score before multiplier)
function getTournamentSpeedMult(rawScore: number): number {
  if (rawScore > 10000) return 2.0
  if (rawScore > 3000) return 1.8
  if (rawScore > 1000) return 1.5
  return 1.0
}

function getTournamentSpeedTier(rawScore: number): number {
  if (rawScore > 10000) return 4
  if (rawScore > 3000) return 3
  if (rawScore > 1000) return 2
  return 1
}

// Item spawn rates — slow rate boosted at high speed
function getSpawnRates(speedTier: number, hasSlow: boolean) {
  return {
    shield: 0.02,
    flash: 0.001,
    slow: speedTier >= 3 ? 0.05 : 0.01,  // 5% at 1.8x+ speed
    double: 0.005,
    magnet: 0.01,
    extralife: 0.0005,
  }
}

// ─── Drawing helpers ──────────────────────────────────────

function drawPixelRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h))
}

function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, hasShield: boolean, hasFlash: boolean) {
  ctx.save()
  ctx.translate(x + BIRD_SIZE / 2, y + BIRD_SIZE / 2)
  ctx.rotate(angle)
  if (hasShield || hasFlash) {
    ctx.shadowColor = hasFlash ? '#f5d020' : '#7c3aed'
    ctx.shadowBlur = 12
  }
  drawPixelRect(ctx, -12, -8, 24, 16, hasFlash ? '#f5d020' : '#f59e0b')
  drawPixelRect(ctx, -8, 2, 12, 6, hasFlash ? '#fbbf24' : '#d97706')
  drawPixelRect(ctx, 6, -6, 6, 6, '#fff')
  drawPixelRect(ctx, 8, -4, 4, 4, '#1e1540')
  drawPixelRect(ctx, 10, -2, 6, 4, '#f97316')
  drawPixelRect(ctx, -4, -4, 8, 10, '#fde68a')
  drawPixelRect(ctx, -6, -18, 16, 4, '#7c3aed')
  drawPixelRect(ctx, -2, -28, 10, 12, '#7c3aed')
  drawPixelRect(ctx, 0, -26, 6, 8, '#a78bfa')
  ctx.restore()
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, topHeight: number, gap: number, canvasHeight: number) {
  const bottomY = topHeight + gap
  const bottomHeight = canvasHeight - bottomY
  drawPixelRect(ctx, x, 0, PIPE_WIDTH, topHeight, '#4c1d95')
  drawPixelRect(ctx, x - 4, topHeight - 16, PIPE_WIDTH + 8, 16, '#6d28d9')
  drawPixelRect(ctx, x + 4, 0, 6, topHeight - 16, '#7c3aed')
  drawPixelRect(ctx, x, bottomY, PIPE_WIDTH, bottomHeight, '#4c1d95')
  drawPixelRect(ctx, x - 4, bottomY, PIPE_WIDTH + 8, 16, '#6d28d9')
  drawPixelRect(ctx, x + 4, bottomY + 16, 6, bottomHeight, '#7c3aed')
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  const pulse = Math.sin(frame * 0.15) * 2
  ctx.save()
  ctx.shadowColor = '#f5d020'
  ctx.shadowBlur = 6
  drawPixelRect(ctx, x - COIN_SIZE / 2 + pulse / 2, y - COIN_SIZE / 2, COIN_SIZE - pulse, COIN_SIZE, '#f5d020')
  drawPixelRect(ctx, x - COIN_SIZE / 2 + 2, y - COIN_SIZE / 2 + 2, 4, 4, '#fde68a')
  ctx.restore()
}

function drawItem(ctx: CanvasRenderingContext2D, item: Item, frame: number) {
  const colors: Record<string, string> = {
    shield: '#7c3aed', flash: '#f5d020', slow: '#06b6d4',
    double: '#10b981', magnet: '#f59e0b', extralife: '#ef4444',
  }
  const labels: Record<string, string> = {
    shield: 'S', flash: 'F', slow: 'SL', double: '2X', magnet: 'M', extralife: '+1',
  }
  const bob = Math.sin(frame * 0.1) * 3
  ctx.save()
  ctx.shadowColor = colors[item.type]
  ctx.shadowBlur = 10
  drawPixelRect(ctx, item.x - ITEM_SIZE / 2, item.y - ITEM_SIZE / 2 + bob, ITEM_SIZE, ITEM_SIZE, colors[item.type])
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 7px "IBM Plex Mono"'
  ctx.textAlign = 'center'
  ctx.fillText(labels[item.type], item.x, item.y + 3 + bob)
  ctx.restore()
}

// ─── Main Component ───────────────────────────────────────

export default function GameEngine({
  onScoreUpdate,
  onGameOver,
  playerItems,
  isPaused,
  gameMode,
  sessionType,
  onJump,
  onCoin,
  onItem,
  onPipe,
}: GameEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    bird: { y: 200, vy: 0 },
    pipes: [] as Pipe[],
    coins: [] as Coin[],
    items: [] as Item[],
    activeEffects: [] as ActiveEffect[],
    rawScore: 0,        // score before multiplier
    score: 0,           // display score (after multiplier)
    pipesPassed: 0,
    coinsCollected: 0,
    frame: 0,
    isAlive: true,
    extraLifeUsed: false,
    pipeTimer: 0,
    angle: 0,
    speedTier: 1,
  })
  const animFrameRef = useRef<number>()
  const isPausedRef = useRef(isPaused)
  const gameModeRef = useRef(gameMode)
  const sessionTypeRef = useRef(sessionType)
  isPausedRef.current = isPaused
  gameModeRef.current = gameMode
  sessionTypeRef.current = sessionType

  const onJumpRef = useRef(onJump)
  const onCoinRef = useRef(onCoin)
  const onItemRef = useRef(onItem)
  const onPipeRef = useRef(onPipe)
  useEffect(() => { onJumpRef.current = onJump }, [onJump])
  useEffect(() => { onCoinRef.current = onCoin }, [onCoin])
  useEffect(() => { onItemRef.current = onItem }, [onItem])
  useEffect(() => { onPipeRef.current = onPipe }, [onPipe])

  const jump = useCallback(() => {
    if (!stateRef.current.isAlive) return
    stateRef.current.bird.vy = JUMP_FORCE
    onJumpRef.current?.()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = stateRef.current

    function hasEffect(type: string) {
      return s.activeEffects.some(e => e.type === type && e.endsAt > Date.now())
    }

    function addEffect(type: string, durationMs: number) {
      const now = Date.now()
      const existing = s.activeEffects.find(e => e.type === type)
      if (existing) { existing.endsAt = now + durationMs }
      else { s.activeEffects.push({ type, endsAt: now + durationMs }) }
    }

    function getModeMultiplier() {
      return MODE_MULTIPLIERS[gameModeRef.current]
    }

    function getTournamentMult() {
      if (sessionTypeRef.current !== 'tournament') return 1
      return getTournamentSpeedMult(s.rawScore)
    }

    function getPipeSpeed() {
      let speed = PIPE_SPEED_BASE
      // Tournament speed tiers
      speed *= getTournamentMult()
      // Item effects
      if (hasEffect('flash')) speed *= 2.5
      else if (hasEffect('slow')) speed *= 0.5
      return speed
    }

    function getScoreMultiplier() {
      let mult = getModeMultiplier()
      if (hasEffect('double')) mult *= 2
      if (hasEffect('flash')) mult *= 2
      return mult
    }

    function getCurrentGap() {
      // Wider gap when slow is active — prevents instant death
      return hasEffect('slow') ? PIPE_GAP_SLOW : PIPE_GAP_BASE
    }

    function spawnItem(x: number, midY: number) {
      const tier = s.speedTier
      const rates = getSpawnRates(tier, hasEffect('slow'))
      for (const [type, rate] of Object.entries(rates)) {
        if (Math.random() < rate) {
          s.items.push({
            x, y: midY + (Math.random() - 0.5) * 60,
            type: type as Item['type'],
            collected: false,
          })
          break
        }
      }
    }

    function spawnCoinChain(x: number, midY: number) {
      const count = 5 + Math.floor(Math.random() * 3)
      for (let i = 0; i < count; i++) {
        s.coins.push({
          x: x + i * 22,
          y: midY + Math.sin(i * 0.8) * 30,
          collected: false,
        })
      }
    }

    function checkCollision(bx: number, by: number): boolean {
      if (by <= 0 || by + BIRD_SIZE >= canvas!.height - 40) return true
      for (const pipe of s.pipes) {
        if (bx + BIRD_SIZE - 8 > pipe.x + 4 && bx + 8 < pipe.x + PIPE_WIDTH - 4) {
          if (by + 8 < pipe.topHeight || by + BIRD_SIZE - 8 > pipe.topHeight + pipe.gap) return true
        }
      }
      return false
    }

    function drawBackground() {
      const grad = ctx.createLinearGradient(0, 0, 0, canvas!.height)
      grad.addColorStop(0, '#0f0a1e')
      grad.addColorStop(1, '#1a1035')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx.fillStyle = 'rgba(167,139,250,0.4)'
      for (let i = 0; i < 30; i++) {
        const sx = ((i * 137 + s.frame * 0.2) % canvas!.width)
        const sy = (i * 79) % (canvas!.height * 0.6)
        ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1)
      }
      drawPixelRect(ctx, 0, canvas!.height - 40, canvas!.width, 40, '#1a1035')
      drawPixelRect(ctx, 0, canvas!.height - 40, canvas!.width, 4, '#4c1d95')
    }

    function drawHUD() {
      // Score
      ctx.fillStyle = '#f5d020'
      ctx.font = '10px "Press Start 2P"'
      ctx.textAlign = 'center'
      ctx.fillText(`${s.score}`, canvas!.width / 2, 30)

      // Mode badge
      const modeColor = MODE_COLORS[gameModeRef.current]
      ctx.fillStyle = modeColor
      ctx.font = '6px "Press Start 2P"'
      ctx.textAlign = 'left'
      ctx.fillText(MODE_LABELS[gameModeRef.current], 8, 12)

      // Tournament speed tier
      if (sessionTypeRef.current === 'tournament' && s.speedTier > 1) {
        const tierColors = ['', '#a78bfa', '#f59e0b', '#ef4444', '#f5d020']
        ctx.fillStyle = tierColors[s.speedTier] || '#fff'
        ctx.font = '6px "Press Start 2P"'
        ctx.textAlign = 'left'
        const tierLabels = ['', '', '1.5x', '1.8x', '2x']
        ctx.fillText(`⚡${tierLabels[s.speedTier]}`, 8, 24)
      }

      // Active effects
      const now = Date.now()
      const active = s.activeEffects.filter(e => e.endsAt > now)
      active.forEach((effect, i) => {
        const remaining = Math.ceil((effect.endsAt - now) / 1000)
        const colors: Record<string, string> = {
          shield: '#7c3aed', flash: '#f5d020', slow: '#06b6d4',
          double: '#10b981', magnet: '#f59e0b', extralife: '#ef4444',
        }
        ctx.fillStyle = colors[effect.type] || '#fff'
        ctx.font = '6px "Press Start 2P"'
        ctx.textAlign = 'right'
        ctx.fillText(`${effect.type.toUpperCase()} ${remaining}s`, canvas!.width - 8, 12 + i * 14)
      })

      // Score multiplier
      const mult = getScoreMultiplier()
      if (mult > 1) {
        ctx.fillStyle = '#f5d020'
        ctx.font = '7px "Press Start 2P"'
        ctx.textAlign = 'center'
        ctx.fillText(`x${mult}`, canvas!.width / 2, 46)
      }
    }

    function loop() {
      if (isPausedRef.current) {
        animFrameRef.current = requestAnimationFrame(loop)
        return
      }

      s.frame++

      // Update speed tier for tournament
      if (sessionTypeRef.current === 'tournament') {
        s.speedTier = getTournamentSpeedTier(s.rawScore)
      }

      const speed = getPipeSpeed()

      // Bird physics
      s.bird.vy += GRAVITY
      s.bird.y += s.bird.vy
      s.angle = Math.max(-0.5, Math.min(1.2, s.bird.vy * 0.08))

      // Spawn pipes
      s.pipeTimer++
      const pipeInterval = Math.max(90, 130 - s.pipesPassed * 0.5)
      if (s.pipeTimer >= pipeInterval) {
        s.pipeTimer = 0
        const gap = getCurrentGap()
        const topHeight = 60 + Math.random() * (canvas!.height - gap - 100)
        const midY = topHeight + gap / 2
        const hasCoinChain = Math.random() < 0.4
        s.pipes.push({ x: canvas!.width, topHeight, gap, passed: false, hasCoinChain })
        if (hasCoinChain) spawnCoinChain(canvas!.width + PIPE_WIDTH + 20, midY)
        spawnItem(canvas!.width + PIPE_WIDTH + 60, midY)
      }

      // Move pipes
      s.pipes = s.pipes.filter(p => p.x + PIPE_WIDTH > -10)
      for (const pipe of s.pipes) {
        pipe.x -= speed
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true
          s.pipesPassed++
          const rawAdd = SCORE_PER_PIPE
          s.rawScore += rawAdd
          s.score += rawAdd * getScoreMultiplier()
          onPipeRef.current?.()
        }
      }

      // Move coins
      const magnetActive = hasEffect('magnet')
      for (const coin of s.coins) {
        coin.x -= speed
        if (magnetActive) {
          const dx = BIRD_X + BIRD_SIZE / 2 - coin.x
          const dy = s.bird.y + BIRD_SIZE / 2 - coin.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) { coin.x += dx * 0.15; coin.y += dy * 0.15 }
        }
      }

      for (const item of s.items) { item.x -= speed }

      // Collect coins
      for (const coin of s.coins) {
        if (coin.collected) continue
        const dx = coin.x - (BIRD_X + BIRD_SIZE / 2)
        const dy = coin.y - (s.bird.y + BIRD_SIZE / 2)
        if (Math.sqrt(dx * dx + dy * dy) < BIRD_SIZE / 2 + COIN_SIZE) {
          coin.collected = true
          s.coinsCollected++
          const rawAdd = 2
          s.rawScore += rawAdd
          s.score += rawAdd * getScoreMultiplier()
          onCoinRef.current?.()
        }
      }

      // Collect items
      for (const item of s.items) {
        if (item.collected) continue
        const dx = item.x - (BIRD_X + BIRD_SIZE / 2)
        const dy = item.y - (s.bird.y + BIRD_SIZE / 2)
        if (Math.sqrt(dx * dx + dy * dy) < BIRD_SIZE / 2 + ITEM_SIZE) {
          item.collected = true
          onItemRef.current?.()
          switch (item.type) {
            case 'shield': addEffect('shield', 30000); break
            case 'flash': addEffect('flash', 15000); break
            case 'slow': addEffect('slow', 10000); break
            case 'double': addEffect('double', 20000); break
            case 'magnet': addEffect('magnet', 15000); break
            case 'extralife': addEffect('extralife', 999999); break
          }
        }
      }

      s.coins = s.coins.filter(c => !c.collected && c.x > -20)
      s.items = s.items.filter(i => !i.collected && i.x > -20)
      s.activeEffects = s.activeEffects.filter(e => e.endsAt > Date.now())

      // Collision
      const isInvincible = hasEffect('shield') || hasEffect('flash')
      if (!isInvincible && checkCollision(BIRD_X, s.bird.y)) {
        if (hasEffect('extralife') && !s.extraLifeUsed) {
          s.extraLifeUsed = true
          s.activeEffects = s.activeEffects.filter(e => e.type !== 'extralife')
          s.bird.vy = JUMP_FORCE
        } else {
          s.isAlive = false
          onGameOver({
            score: s.score,
            pipes: s.pipesPassed,
            coins: s.coinsCollected,
            isAlive: false,
            activeEffects: s.activeEffects,
            speedTier: s.speedTier,
          })
          return
        }
      }

      drawBackground()
      for (const pipe of s.pipes) drawPipe(ctx, pipe.x, pipe.topHeight, pipe.gap, canvas!.height)
      for (const coin of s.coins) { if (!coin.collected) drawCoin(ctx, coin.x, coin.y, s.frame) }
      for (const item of s.items) { if (!item.collected) drawItem(ctx, item, s.frame) }
      drawBird(ctx, BIRD_X, s.bird.y, s.angle, hasEffect('shield'), hasEffect('flash'))
      drawHUD()

      if (s.frame % 30 === 0) {
        onScoreUpdate({
          score: s.score,
          pipes: s.pipesPassed,
          coins: s.coinsCollected,
          isAlive: true,
          activeEffects: s.activeEffects,
          speedTier: s.speedTier,
        })
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [onScoreUpdate, onGameOver])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); jump() }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [jump])

  return (
    <canvas
      ref={canvasRef}
      width={390}
      height={600}
      onClick={jump}
      onTouchStart={(e) => { e.preventDefault(); jump() }}
      className="w-full h-full cursor-pointer"
      style={{ touchAction: 'none' }}
    />
  )
}
