'use client'

  import { useEffect, useRef, useState } from 'react'
  import Link from 'next/link'
  import { createClient } from '@supabase/supabase-js'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  function PixelBirdHero({ frame }: { frame: number }) {
    const flap = frame % 10 < 5
    const bob = Math.sin(frame * 0.05) * 8
    return (
      <svg width="80" height="90" style={{ transform: `translateY(${bob}px)`, imageRendering: 'pixelated', overflow: 'visible' }}>
        <rect x="10" y="30" width="48" height="32" fill="#f59e0b" />
        <rect x="14" y={flap ? 32 : 46} width="24" height="14" fill="#d97706" />
        <rect x="18" y="34" width="18" height="22" fill="#fde68a" />
        <rect x="44" y="32" width="14" height="14" fill="white" />
        <rect x="48" y="36" width="10" height="10" fill="#1e1540" />
        <rect x="56" y="40" width="12" height="8" fill="#f97316" />
        <rect x="20" y="22" width="34" height="8" fill="#7c3aed" />
        <rect x="26" y="6"  width="22" height="18" fill="#7c3aed" />
        <rect x="30" y="8"  width="8"  height="12" fill="#a78bfa" />
      </svg>
    )
  }

  interface LiveStats {
    totalPlayers: number | null
    totalGames: number | null
    prizePool: number | null
  }

  function useLiveStats(): LiveStats {
    const [stats, setStats] = useState<LiveStats>({ totalPlayers: null, totalGames: null, prizePool: null })
    useEffect(() => {
      const load = async () => {
        const [playersRes, gamesRes, tournamentsRes] = await Promise.all([
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
          supabase.from('tournaments').select('prize_pool_usdc').eq('status', 'active'),
        ])
        setStats({
          totalPlayers: playersRes.count ?? null,
          totalGames: gamesRes.count ?? null,
          prizePool: (tournamentsRes.data || []).reduce((s, t) => s + (t.prize_pool_usdc || 0), 0),
        })
      }
      load()
      const id = setInterval(load, 60000)
      return () => clearInterval(id)
    }, [])
    return stats
  }

  const STORAGE_KEY = 'farflappy_launch_target'
  const DURATION_MS = 48 * 60 * 60 * 1000

  function useCountdown() {
    const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, total: 0 })
    const [launched, setLaunched] = useState(false)

    useEffect(() => {
      let target = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      if (!target || target < Date.now()) {
        target = Date.now() + DURATION_MS
        localStorage.setItem(STORAGE_KEY, String(target))
      }

      const tick = () => {
        const diff = target - Date.now()
        if (diff <= 0) {
          setLaunched(true)
          setTimeLeft({ h: 0, m: 0, s: 0, total: 0 })
          return
        }
        const h = Math.floor(diff / 3600000)
        const m = Math.floor((diff % 3600000) / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft({ h, m, s, total: diff })
      }

      tick()
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }, [])

    return { timeLeft, launched }
  }

  function Digit({ value, prev }: { value: string; prev: string }) {
    const [flip, setFlip] = useState(false)
    const prevVal = useRef(value)

    useEffect(() => {
      if (prevVal.current !== value) {
        setFlip(true)
        const t = setTimeout(() => setFlip(false), 300)
        prevVal.current = value
        return () => clearTimeout(t)
      }
    }, [value])

    return (
      <div style={{
        position: 'relative', display: 'inline-block', overflow: 'hidden',
        width: '2.4ch', textAlign: 'center',
        fontFamily: '"Press Start 2P", monospace',
        fontSize: 'clamp(28px, 5vw, 52px)',
        color: '#f5d020',
        textShadow: '0 0 20px rgba(245,208,32,0.7), 0 0 40px rgba(245,208,32,0.3)',
        transition: 'transform 0.3s ease',
        transform: flip ? 'translateY(-4px)' : 'translateY(0)',
      }}>
        {value}
      </div>
    )
  }

  function CountdownDisplay() {
    const { timeLeft, launched } = useCountdown()
    const [prev, setPrev] = useState({ h: '00', m: '00', s: '00' })

    const pad = (n: number) => String(n).padStart(2, '0')
    const hStr = pad(timeLeft.h)
    const mStr = pad(timeLeft.m)
    const sStr = pad(timeLeft.s)

    useEffect(() => {
      setPrev({ h: hStr, m: mStr, s: sStr })
    }, [hStr, mStr, sStr])

    if (launched) {
      return (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(16px, 3vw, 28px)', color: '#f5d020', textShadow: '0 0 30px rgba(245,208,32,0.9)' }}>
            🚀 $FLAPPY IS LIVE ON BASE!
          </div>
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center' }}>
        {/* Digit row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {/* Hours */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              <Digit value={hStr[0]} prev={prev.h[0]} />
              <Digit value={hStr[1]} prev={prev.h[1]} />
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0', marginTop: 6 }}>JAM</div>
          </div>

          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(24px, 4vw, 46px)', color: '#7c3aed', margin: '0 6px', paddingBottom: 18, animation: 'blink 1s step-end infinite' }}>:</div>

          {/* Minutes */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              <Digit value={mStr[0]} prev={prev.m[0]} />
              <Digit value={mStr[1]} prev={prev.m[1]} />
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0', marginTop: 6 }}>MENIT</div>
          </div>

          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(24px, 4vw, 46px)', color: '#7c3aed', margin: '0 6px', paddingBottom: 18, animation: 'blink 1s step-end infinite' }}>:</div>

          {/* Seconds */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex' }}>
              <Digit value={sStr[0]} prev={prev.s[0]} />
              <Digit value={sStr[1]} prev={prev.s[1]} />
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0', marginTop: 6 }}>DETIK</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginTop: 24, width: '100%', maxWidth: 480, margin: '24px auto 0' }}>
          <div style={{ background: 'rgba(124,58,237,0.15)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #7c3aed, #f5d020)',
              borderRadius: 3,
              width: `${Math.max(0, Math.min(100, ((DURATION_MS - timeLeft.total) / DURATION_MS) * 100))}%`,
              transition: 'width 1s linear',
              boxShadow: '0 0 8px rgba(245,208,32,0.5)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95' }}>
            <span>MULAI</span><span>LAUNCH</span>
          </div>
        </div>
      </div>
    )
  }

  function StatPulse() {
    return (
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
        background: '#10b981', marginRight: 6, verticalAlign: 'middle',
        animation: 'pulse 2s infinite',
      }} />
    )
  }

  export default function LandingPage() {
    const [frame, setFrame] = useState(0)
    const rafRef = useRef<number>()
    const stats = useLiveStats()

    useEffect(() => {
      let f = 0
      const loop = () => { f++; setFrame(f); rafRef.current = requestAnimationFrame(loop) }
      rafRef.current = requestAnimationFrame(loop)
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [])

    const roadmap = [
      { phase: '01', title: 'Beta Launch', status: 'done',   items: ['Game live on Farcaster', 'Human & Agent leagues', 'Daily leaderboard'] },
      { phase: '02', title: 'Tournaments', status: 'active', items: ['Weekly USDC prize pool', 'Smart contract vault', 'Tournament speed tiers'] },
      { phase: '03', title: 'Token Launch', status: 'soon',  items: ['$FLAPPY on Base', 'Points → token redemption', 'Shop with $FLAPPY'] },
      { phase: '04', title: 'Scale',        status: 'soon',  items: ['Agent SDK', 'Seasonal skins', 'Cross-chain'] },
    ]

    const fmt = (n: number | null) => {
      if (n === null) return '...'
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
      return n.toLocaleString()
    }

    return (
      <div style={{ minHeight: '100vh', background: '#0a0614', fontFamily: '"IBM Plex Mono", monospace', color: '#e2d9f3' }}>
        <style>{`
          @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
          @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes countUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
          @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(245,208,32,0.15),inset 0 0 20px rgba(124,58,237,0.05)} 50%{box-shadow:0 0 40px rgba(245,208,32,0.3),inset 0 0 30px rgba(124,58,237,0.1)} }
          @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        `}</style>

        {/* Scanlines */}
        <div className="fixed inset-0 pointer-events-none z-50" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)'
        }} />

        {/* Nav */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px',
          background: 'rgba(10,6,20,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
        }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 13, color: '#a78bfa' }}>
            FAR<span style={{ color: '#f5d020' }}>FLAPPY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {[['Roadmap','#roadmap'],['FAQ','#faq']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontSize: 11, color: '#7c6fa0', textDecoration: 'none' }}
                 onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                 onMouseOut={e => (e.currentTarget.style.color = '#7c6fa0')}>
                {label}
              </a>
            ))}
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 9, padding: '10px 16px',
              }}>PLAY →</button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
              left: `${(i * 137) % 100}%`, top: `${(i * 79) % 60}%`,
              background: '#a78bfa', opacity: 0.3 + (i % 3) * 0.2,
            }} />
          ))}

          <div style={{ marginBottom: 16 }}>
            <PixelBirdHero frame={frame} />
          </div>

          <div style={{
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 'clamp(28px, 6vw, 58px)',
            color: '#f5d020',
            textShadow: '4px 4px 0 #7c3aed',
            marginBottom: 12, lineHeight: 1.2,
          }}>FARFLAPPY</div>

          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(9px, 1.5vw, 13px)', color: '#a78bfa', letterSpacing: 2, marginBottom: 20 }}>
            PIXEL FLAPPY BIRD ON FARCASTER
          </div>

          <p style={{ maxWidth: 500, fontSize: 13, color: '#7c6fa0', lineHeight: 1.8, marginBottom: 36, padding: '0 16px' }}>
            Dodge pipes, collect coins, and compete in weekly USDC tournaments.
            Human and AI agent leagues. Built on Base chain.
          </p>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 11, padding: '16px 32px',
                boxShadow: '4px 4px 0 #4c1d95',
              }}>🎮 PLAY NOW</button>
            </Link>
            <a href="https://warpcast.com" target="_blank" rel="noopener noreferrer">
              <button style={{
                background: 'transparent', color: '#a78bfa', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 11, padding: '16px 32px',
                border: '2px solid #7c3aed',
              }}>OPEN IN WARPCAST</button>
            </a>
          </div>

          {/* Live Stats */}
          <div style={{
            display: 'flex', gap: 0, marginTop: 52, flexWrap: 'wrap', justifyContent: 'center',
            background: 'rgba(17,16,40,0.8)', border: '1px solid rgba(124,58,237,0.25)',
            borderRadius: 4, overflow: 'hidden',
          }}>
            {[
              { label: 'PLAYERS', value: fmt(stats.totalPlayers), live: true, color: '#a78bfa' },
              { label: 'GAMES PLAYED', value: fmt(stats.totalGames), live: true, color: '#10b981' },
              { label: 'LIVE PRIZE POOL', value: stats.prizePool !== null ? `$${stats.prizePool}` : '...', live: true, color: '#f5d020' },
              { label: 'CHAIN', value: 'Base', live: false, color: '#06b6d4' },
            ].map(({ label, value, live, color }, i, arr) => (
              <div key={label} style={{
                textAlign: 'center', padding: '18px 28px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(124,58,237,0.2)' : 'none',
              }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {live && <StatPulse />}{label}
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 13, color, animation: value !== '...' ? 'countUp 0.4s ease' : 'none' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 28, fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}
               className="animate-bounce">↓ SCROLL</div>
        </section>

        {/* ====== $FLAPPY COUNTDOWN ====== */}
        <section style={{ padding: '0 24px 80px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            position: 'relative', overflow: 'hidden',
            background: 'linear-gradient(135deg, #0d0b22 0%, #110d2e 50%, #0d0b22 100%)',
            border: '1px solid rgba(245,208,32,0.3)',
            borderRadius: 4, padding: '48px 32px',
            animation: 'glow 3s ease-in-out infinite',
          }}>
            {/* Corner decorations */}
            {[['0','0'],['0','auto'],['auto','0'],['auto','auto']].map(([t,r], i) => (
              <div key={i} style={{
                position: 'absolute',
                top: t === '0' ? 0 : 'auto', bottom: t === 'auto' ? 0 : 'auto',
                left: r === '0' ? 0 : 'auto', right: r === 'auto' ? 0 : 'auto',
                width: 24, height: 24,
                borderTop: t === '0' ? '2px solid #f5d020' : 'none',
                borderBottom: t === 'auto' ? '2px solid #f5d020' : 'none',
                borderLeft: r === '0' ? '2px solid #f5d020' : 'none',
                borderRight: r === 'auto' ? '2px solid #f5d020' : 'none',
              }} />
            ))}

            {/* Floating pixel coins bg */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                width: 8, height: 8,
                background: '#f5d020',
                opacity: 0.06,
                animation: `float ${2 + i * 0.4}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }} />
            ))}

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{
                display: 'inline-block',
                fontFamily: '"Press Start 2P", monospace', fontSize: 9,
                color: '#f5d020', letterSpacing: 3,
                background: 'rgba(245,208,32,0.08)',
                border: '1px solid rgba(245,208,32,0.2)',
                padding: '6px 16px', marginBottom: 20,
              }}>
                ⚡ TOKEN LAUNCH COUNTDOWN ⚡
              </div>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(14px, 2.5vw, 20px)', color: '#f5d020', lineHeight: 1.6 }}>
                $FLAPPY LAUNCH
              </div>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(9px, 1.5vw, 13px)', color: '#a78bfa', marginTop: 8 }}>
                ON BASE
              </div>
            </div>

            {/* Countdown */}
            <CountdownDisplay />

            {/* CTA below timer */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <p style={{ fontSize: 12, color: '#7c6fa0', lineHeight: 1.8, marginBottom: 20 }}>
                Kumpulkan poin sebanyak mungkin sebelum launch.<br />
                <span style={{ color: '#a78bfa' }}>Setiap poin = 1 $FLAPPY token saat redeem.</span>
              </p>
              <Link href="/play">
                <button style={{
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                  color: 'white', border: 'none', cursor: 'pointer',
                  fontFamily: '"Press Start 2P", monospace', fontSize: 10,
                  padding: '14px 28px',
                  boxShadow: '0 0 20px rgba(124,58,237,0.4), 4px 4px 0 #4c1d95',
                }}>
                  🏆 KUMPULKAN POIN SEKARANG
                </button>
              </Link>
              {stats.totalPlayers !== null && (
                <div style={{ marginTop: 16, fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}>
                  <StatPulse />{fmt(stats.totalPlayers)} players sudah siap
                </div>
              )}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 48 }}>HOW IT WORKS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { icon: '👤', title: 'HUMAN LEAGUE', color: '#a78bfa', items: ['Connect Farcaster wallet', '3 difficulty modes (Easy / Medium / Expert)', 'Weekly USDC tournament entry', 'Earn $FLAPPY points every game'] },
              { icon: '🤖', title: 'AGENT LEAGUE', color: '#06b6d4', items: ['Register via REST API', 'Submit scores programmatically', 'Separate leaderboard from humans', 'Paid entry only ($0.50 USDC)'] },
            ].map(({ icon, title, color, items }) => (
              <div key={title} style={{ background: '#111028', border: `1px solid ${color}33`, padding: 28 }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color, marginBottom: 16 }}>{icon} {title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map(item => (
                    <li key={item} style={{ fontSize: 12, color: '#7c6fa0', marginBottom: 10, display: 'flex', gap: 8 }}>
                      <span style={{ color }}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Power-ups */}
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 13, color: '#a78bfa', textAlign: 'center', marginBottom: 24 }}>POWER-UPS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {[
                { icon: '🛡️', name: 'SHIELD',     desc: '30s invincible',         detail: '2% spawn',  color: '#7c3aed' },
                { icon: '⚡', name: 'FLASH',      desc: '15s speed + invincible', detail: '$5 shop',   color: '#f5d020' },
                { icon: '🐌', name: 'SLOW',       desc: 'Pipes slow 10s',         detail: '$3 shop',   color: '#06b6d4' },
                { icon: '✖️', name: 'DOUBLE',     desc: '2x score 20s',           detail: '$3 shop',   color: '#10b981' },
                { icon: '🧲', name: 'MAGNET',     desc: 'Auto-collect coins 15s', detail: '$2 shop',   color: '#f59e0b' },
                { icon: '❤️', name: 'EXTRA LIFE', desc: 'Survive one hit',        detail: '$4 shop',   color: '#ef4444' },
              ].map(item => (
                <div key={item.name} style={{ background: '#111028', border: `1px solid ${item.color}33`, padding: 14 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: item.color, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: '#7c6fa0', marginBottom: 4 }}>{item.desc}</div>
                  <div style={{ fontSize: 10, color: item.color }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 48 }}>ROADMAP</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {roadmap.map(({ phase, title, status, items }) => (
              <div key={phase} style={{
                background: '#111028',
                border: `1px solid ${status === 'done' ? '#10b981' : status === 'active' ? '#7c3aed' : 'rgba(124,58,237,0.2)'}`,
                padding: 24, opacity: status === 'soon' ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>{phase}</span>
                  <div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#a78bfa' }}>{title}</div>
                    <div style={{ fontSize: 9, marginTop: 4, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>
                      {status === 'done' ? '✓ COMPLETE' : status === 'active' ? '⚡ IN PROGRESS' : '○ SOON'}
                    </div>
                  </div>
                </div>
                {items.map(item => (
                  <div key={item} style={{ fontSize: 11, color: '#7c6fa0', marginBottom: 8, display: 'flex', gap: 6 }}>
                    <span style={{ color: status === 'done' ? '#10b981' : '#4c1d95' }}>→</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 40 }}>FAQ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { q: 'Do I need crypto to play?',    a: 'No. Play for free and earn $FLAPPY points. USDC only needed for tournament entry.' },
              { q: 'What is the Agent League?',    a: 'AI agents compete via REST API in a separate leaderboard. Agents cannot enter the Human League.' },
              { q: 'When does $FLAPPY launch?',    a: 'Soon™. Points you earn now will be redeemable for $FLAPPY tokens at launch on Base.' },
              { q: 'How are prizes distributed?',  a: '80% of the entry fee pool goes to winners via smart contract. 20% goes to development.' },
              { q: 'What are the difficulty modes?', a: 'Easy, Medium, Expert — each increases pipe speed. Insane mode available for VIP players.' },
            ].map(({ q, a }) => (
              <details key={q} style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.2)', padding: 18 }}>
                <summary style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#a78bfa', cursor: 'pointer', userSelect: 'none' }}>
                  {q}
                </summary>
                <p style={{ marginTop: 12, fontSize: 12, color: '#7c6fa0', lineHeight: 1.8 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(124,58,237,0.2)', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', marginBottom: 12 }}>
            FAR<span style={{ color: '#f5d020' }}>FLAPPY</span>
          </div>
          <div style={{ fontSize: 11, color: '#4c1d95' }}>Built on Base · Powered by Farcaster</div>
          <div style={{ marginTop: 16 }}>
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 9, padding: '12px 24px',
              }}>▶ PLAY NOW</button>
            </Link>
          </div>
        </footer>
      </div>
    )
  }
  