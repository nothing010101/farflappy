'use client'

import { useRef, useCallback, useEffect } from 'react'

// ─── Chiptune Engine using Web Audio API ───────────────────

// Notes: frequency in Hz
const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
  REST: 0,
}

// Main theme melody — cheerful chiptune
const MELODY: [number, number][] = [
  // bar 1
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C5, 0.15],
  [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.C4, 0.15], [NOTES.REST, 0.15],
  // bar 2
  [NOTES.D4, 0.15], [NOTES.F4, 0.15], [NOTES.A4, 0.15], [NOTES.D5, 0.15],
  [NOTES.A4, 0.15], [NOTES.F4, 0.15], [NOTES.D4, 0.15], [NOTES.REST, 0.15],
  // bar 3
  [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.B4, 0.15], [NOTES.E5, 0.15],
  [NOTES.B4, 0.15], [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.REST, 0.15],
  // bar 4
  [NOTES.G4, 0.15], [NOTES.E4, 0.15], [NOTES.C4, 0.15], [NOTES.E4, 0.15],
  [NOTES.G4, 0.30], [NOTES.REST, 0.15], [NOTES.C5, 0.15],
  // bar 5 - climax
  [NOTES.C5, 0.15], [NOTES.B4, 0.15], [NOTES.A4, 0.15], [NOTES.G4, 0.15],
  [NOTES.A4, 0.15], [NOTES.B4, 0.15], [NOTES.C5, 0.30],
  // bar 6
  [NOTES.G4, 0.15], [NOTES.F4, 0.15], [NOTES.E4, 0.15], [NOTES.D4, 0.15],
  [NOTES.E4, 0.15], [NOTES.F4, 0.15], [NOTES.G4, 0.30],
  // bar 7
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C5, 0.15],
  [NOTES.B4, 0.15], [NOTES.A4, 0.15], [NOTES.G4, 0.15], [NOTES.F4, 0.15],
  // bar 8 - resolve
  [NOTES.E4, 0.15], [NOTES.G4, 0.15], [NOTES.C4, 0.30], [NOTES.REST, 0.15],
  [NOTES.C4, 0.15], [NOTES.E4, 0.15], [NOTES.G4, 0.15],
]

// Bass line
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

function createSquareOscillator(ctx: AudioContext, freq: number, gain: number, time: number, duration: number) {
  if (freq === 0) return
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(freq, time)
  gainNode.gain.setValueAtTime(0, time)
  gainNode.gain.linearRampToValueAtTime(gain, time + 0.01)
  gainNode.gain.setValueAtTime(gain, time + duration * 0.7)
  gainNode.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration)
}

function createTriangleOscillator(ctx: AudioContext, freq: number, gain: number, time: number, duration: number) {
  if (freq === 0) return
  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, time)
  gainNode.gain.setValueAtTime(gain, time)
  gainNode.gain.linearRampToValueAtTime(0, time + duration)
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(time)
  osc.stop(time + duration)
}

export function useChiptune() {
  const ctxRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const scheduledRef = useRef(false)
  const nextLoopRef = useRef(0)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return ctxRef.current
  }, [])

  const scheduleMusic = useCallback((ctx: AudioContext, startTime: number) => {
    // Melody (square wave, quieter)
    let t = startTime
    for (const [freq, dur] of MELODY) {
      createSquareOscillator(ctx, freq, 0.06, t, dur * 0.9)
      t += dur
    }

    // Bass (triangle, deeper)
    let tb = startTime
    for (const [freq, dur] of BASS) {
      createTriangleOscillator(ctx, freq, 0.08, tb, dur * 0.8)
      tb += dur
    }

    // Percussion (noise bursts)
    const beatDur = 0.30
    const totalBeats = Math.floor((t - startTime) / beatDur)
    for (let i = 0; i < totalBeats; i++) {
      if (i % 4 === 0 || i % 4 === 2) {
        // Kick - short low thump
        const kickOsc = ctx.createOscillator()
        const kickGain = ctx.createGain()
        kickOsc.type = 'sine'
        kickOsc.frequency.setValueAtTime(120, startTime + i * beatDur)
        kickOsc.frequency.exponentialRampToValueAtTime(40, startTime + i * beatDur + 0.08)
        kickGain.gain.setValueAtTime(0.15, startTime + i * beatDur)
        kickGain.gain.linearRampToValueAtTime(0, startTime + i * beatDur + 0.1)
        kickOsc.connect(kickGain)
        kickGain.connect(ctx.destination)
        kickOsc.start(startTime + i * beatDur)
        kickOsc.stop(startTime + i * beatDur + 0.12)
      }
    }

    return t - startTime // return loop duration
  }, [])

  const startMusic = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime
    const loopDur = scheduleMusic(ctx, now)
    nextLoopRef.current = now + loopDur
    scheduledRef.current = true

    // Schedule loop repeats
    const loopInterval = setInterval(() => {
      if (!scheduledRef.current || mutedRef.current) {
        clearInterval(loopInterval)
        return
      }
      const curr = ctxRef.current?.currentTime ?? 0
      if (curr >= nextLoopRef.current - 0.5) {
        const dur = scheduleMusic(ctxRef.current!, nextLoopRef.current)
        nextLoopRef.current += dur
      }
    }, 500)

    return () => clearInterval(loopInterval)
  }, [getCtx, scheduleMusic])

  const stopMusic = useCallback(() => {
    scheduledRef.current = false
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
  }, [])

  // ─── Sound Effects ─────────────────────────────────────

  const sfxJump = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    createSquareOscillator(ctx, 440, 0.1, now, 0.04)
    createSquareOscillator(ctx, 660, 0.08, now + 0.04, 0.04)
  }, [getCtx])

  const sfxCoin = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    createSquareOscillator(ctx, 784, 0.08, now, 0.05)
    createSquareOscillator(ctx, 1047, 0.06, now + 0.05, 0.05)
    createSquareOscillator(ctx, 1319, 0.04, now + 0.10, 0.08)
  }, [getCtx])

  const sfxDeath = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    // Descending sad trombone
    const freqs = [392, 349, 294, 220, 196, 175, 131]
    freqs.forEach((f, i) => {
      createSquareOscillator(ctx, f, 0.12, now + i * 0.08, 0.12)
    })
  }, [getCtx])

  const sfxItem = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    // Power up jingle
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((f, i) => {
      createSquareOscillator(ctx, f, 0.08, now + i * 0.06, 0.08)
    })
  }, [getCtx])

  const sfxScore = useCallback(() => {
    if (mutedRef.current) return
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
    const now = ctx.currentTime
    createSquareOscillator(ctx, 523, 0.06, now, 0.03)
    createSquareOscillator(ctx, 659, 0.05, now + 0.03, 0.03)
  }, [getCtx])

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current
    if (mutedRef.current) {
      stopMusic()
    }
    return mutedRef.current
  }, [stopMusic])

  const isMuted = useCallback(() => mutedRef.current, [])

  useEffect(() => {
    return () => {
      ctxRef.current?.close()
    }
  }, [])

  return {
    startMusic,
    stopMusic,
    sfxJump,
    sfxCoin,
    sfxDeath,
    sfxItem,
    sfxScore,
    toggleMute,
    isMuted,
  }
}
