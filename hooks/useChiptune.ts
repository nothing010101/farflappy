'use client'

import { useRef, useCallback, useEffect } from 'react'

const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
  REST: 0,
}

const MELODY: [number, number][] = [
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C5, 0.15],
  [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.C4, 0.15], [NOTES.REST, 0.15],
  [NOTES.D4, 0.15], [NOTES.F4, 0.15], [NOTES.A4, 0.15], [NOTES.D5, 0.15],
  [NOTES.A4, 0.15], [NOTES.F4, 0.15], [NOTES.D4, 0.15], [NOTES.REST, 0.15],
  [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.B4, 0.15], [NOTES.E5, 0.15],
  [NOTES.B4, 0.15], [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.REST, 0.15],
  [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.C4, 0.15], [NOTES.E4, 0.15],
  [NOTES.G4, 0.30], [NOTES.REST, 0.15], [NOTES.C5, 0.15],
  [NOTES.C5, 0.15], [NOTES.B4, 0.15], [NOTES.A4, 0.15], [NOTES.G4, 0.15],
  [NOTES.A4, 0.15], [NOTES.B4, 0.15], [NOTES.C5, 0.30],
  [NOTES.G4, 0.15], [NOTES.F4, 0.15], [NOTES.E4, 0.15], [NOTES.D4, 0.15],
  [NOTES.E4, 0.15], [NOTES.F4, 0.15], [NOTES.G4, 0.30],
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C5, 0.15],
  [NOTES.B4, 0.15], [NOTES.A4, 0.15], [NOTES.G4, 0.15], [NOTES.F4, 0.15],
  [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C4, 0.30], [NOTES.REST, 0.15],
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15],
]

const BASS: [number, number][] = [
  [NOTES.C3, 0.30], [NOTES.G3, 0.30], [NOTES.C3, 0.30], [NOTES.G3, 0.30],
  [NOTES.D3, 0.30], [NOTES.A3, 0.30], [NOTES.D3, 0.30], [NOTES.A3, 0.30],
  [NOTES.E3, 0.30], [NOTES.B3, 0.30], [NOTES.E3, 0.30], [NOTES.B3, 0.30],
  [NOTES.G3, 0.30], [NOTES.C3, 0.30], [NOTES.G3, 0.30], [NOTES.C3, 0.30],
  [NOTES.C3, 0.30], [NOTES.G3, 0.30], [NOTES.C3, 0.30], [NOTES.G3, 0.30],
  [NOTES.D3, 0.30], [NOTES.A3, 0.30], [NOTES.D3, 0.30], [NOTES.A3, 0.30],
  [NOTES.C3, 0.30], [NOTES.E3, 0.30], [NOTES.G3, 0.30], [NOTES.C3, 0.30],
  [NOTES.C3, 0.60], [NOTES.G3, 0.60],
]

function getOrCreateCtx(ctxRef: React.MutableRefObject<AudioContext | null>) {
  if (!ctxRef.current || ctxRef.current.state === 'closed') {
    ctxRef.current = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (ctxRef.current.state === 'suspended') {
    ctxRef.current.resume()
  }
  return ctxRef.current
}

function playSquare(ctx: AudioContext, freq: number, gain: number, time: number, duration: number) {
  if (freq === 0) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, time)
  g.gain.setValueAtTime(0, time)
  g.gain.linearRampToValueAtTime(gain, time + 0.01)
  g.gain.setValueAtTime(gain, time + duration * 0.7)
  g.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration + 0.05)
}

function playTriangle(ctx: AudioContext, freq: number, gain: number, time: number, duration: number) {
  if (freq === 0) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, time)
  g.gain.setValueAtTime(gain, time)
  g.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration + 0.05)
}

export function useChiptune() {
  const ctxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const scheduledRef = useRef(false)
  const nextLoopRef = useRef(0)
  const loopTimerRef = useRef<ReturnType<typeof setInterval>>()

  const scheduleMusic = useCallback((ctx: AudioContext, startTime: number) => {
    let t = startTime
    for (const [freq, dur] of MELODY) {
      playSquare(ctx, freq, 0.06, t, dur * 0.9)
      t += dur
    }
    let tb = startTime
    for (const [freq, dur] of BASS) {
      playTriangle(ctx, freq, 0.08, tb, dur * 0.8)
      tb += dur
    }
    const beatDur = 0.30
    const totalBeats = Math.floor((t - startTime) / beatDur)
    for (let i = 0; i < totalBeats; i++) {
      if (i % 4 === 0 || i % 4 === 2) {
        const kick = ctx.createOscillator()
        const kg = ctx.createGain()
        kick.type = 'sine'
        kick.frequency.setValueAtTime(120, startTime + i * beatDur)
        kick.frequency.exponentialRampToValueAtTime(40, startTime + i * beatDur + 0.08)
        kg.gain.setValueAtTime(0.15, startTime + i * beatDur)
        kg.gain.linearRampToValueAtTime(0, startTime + i * beatDur + 0.1)
        kick.connect(kg)
        kg.connect(ctx.destination)
        kick.start(startTime + i * beatDur)
        kick.stop(startTime + i * beatDur + 0.15)
      }
    }
    return t - startTime
  }, [])

  const startMusic = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getOrCreateCtx(ctxRef)
    scheduledRef.current = true
    const now = ctx.currentTime
    const loopDur = scheduleMusic(ctx, now)
    nextLoopRef.current = now + loopDur

    loopTimerRef.current = setInterval(() => {
      if (!scheduledRef.current || mutedRef.current) return
      const c = ctxRef.current
      if (!c || c.state === 'closed') return
      const curr = c.currentTime
      if (curr >= nextLoopRef.current - 0.5) {
        const dur = scheduleMusic(c, nextLoopRef.current)
        nextLoopRef.current += dur
      }
    }, 500)
  }, [scheduleMusic])

  const stopMusic = useCallback(() => {
    scheduledRef.current = false
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current)
    }
    // Fade out then close
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      const ctx = ctxRef.current
      // Close after a short delay so sfxDeath still plays
      setTimeout(() => {
        if (ctx.state !== 'closed') ctx.close()
        ctxRef.current = null
      }, 2000)
    }
  }, [])

  // ─── SFX — always create fresh ctx so they work even after stopMusic ───

  const sfxJump = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getOrCreateCtx(ctxRef)
    const now = ctx.currentTime
    playSquare(ctx, 440, 0.1, now, 0.04)
    playSquare(ctx, 660, 0.08, now + 0.04, 0.04)
  }, [])

  const sfxCoin = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getOrCreateCtx(ctxRef)
    const now = ctx.currentTime
    playSquare(ctx, 784, 0.08, now, 0.05)
    playSquare(ctx, 1047, 0.06, now + 0.05, 0.05)
    playSquare(ctx, 1319, 0.04, now + 0.10, 0.08)
  }, [])

  const sfxDeath = useCallback(() => {
    if (mutedRef.current) return
    // Create a FRESH context just for death sfx so it definitely plays
    const freshCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()

    const now = freshCtx.currentTime
    // Sad descending trombone
    const freqs = [392, 349, 294, 247, 220, 185, 147]
    freqs.forEach((f, i) => {
      playSquare(freshCtx, f, 0.15, now + i * 0.10, 0.15)
      // harmony below
      playTriangle(freshCtx, f * 0.5, 0.08, now + i * 0.10, 0.15)
    })

    // Close fresh ctx after sfx done
    setTimeout(() => {
      freshCtx.close()
    }, 1500)
  }, [])

  const sfxItem = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getOrCreateCtx(ctxRef)
    const now = ctx.currentTime
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((f, i) => {
      playSquare(ctx, f, 0.08, now + i * 0.06, 0.08)
    })
  }, [])

  const sfxScore = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getOrCreateCtx(ctxRef)
    const now = ctx.currentTime
    playSquare(ctx, 523, 0.05, now, 0.03)
    playSquare(ctx, 659, 0.04, now + 0.03, 0.03)
  }, [])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    if (mutedRef.current) {
      scheduledRef.current = false
      if (loopTimerRef.current) clearInterval(loopTimerRef.current)
    }
    return mutedRef.current
  }, [])

  const isMuted = useCallback(() => mutedRef.current, [])

  useEffect(() => {
    return () => {
      scheduledRef.current = false
      if (loopTimerRef.current) clearInterval(loopTimerRef.current)
      ctxRef.current?.close()
    }
  }, [])

  return { startMusic, stopMusic, sfxJump, sfxCoin, sfxDeath, sfxItem, sfxScore, toggleMute, isMuted }
}
