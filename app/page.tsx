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
      <svg width="70" height="80" style={{ transform: `translateY(${bob}px)`, imageRendering: 'pixelated', overflow: 'visible' }}>
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
    const [ready, setReady] = useState(false)

    useEffect(() => {
      let target = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
      if (!target || target < Date.now()) {
        target = Date.now() + DURATION_MS
        localStorage.setItem(STORAGE_KEY, String(target))
      }
      const tick = () => {
        const diff = target - Date.now()
        if (diff <= 0) { setLaunched(true); setTimeLeft({ h: 0, m: 0, s: 0, total: 0 }); return }
        setTimeLeft({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000), total: diff })
      }
      tick()
      setReady(true)
      const id = setInterval(tick, 1000)
      return () => clearInterval(id)
    }, [])

    return { timeLeft, launched, ready }
  }

  function StatPulse() {
    return <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#10b981', marginRight: 5, verticalAlign: 'middle', animation: 'pulse 2s infinite' }} />
  }

  function CountdownSection({ stats }: { stats: LiveStats }) {
    const { timeLeft, launched, ready } = useCountdown()
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmt = (n: number | null) => { if (n === null) return '...'; if (n >= 1000) return (n / 1000).toFixed(1) + 'K'; return n.toLocaleString() }

    return (
      <section style={{ padding: '0 16px 60px', maxWidth: 680, margin: '0 auto' }}>
        <div style={{
          position: 'relative', overflow: 'hidden',
          background: 'linear-gradient(135deg, #0d0b22 0%, #110d2e 50%, #0d0b22 100%)',
          border: '1px solid rgba(245,208,32,0.3)',
          padding: '32px 20px',
          animation: 'glow 3s ease-in-out infinite',
        }}>
          {/* Corner dots */}
          {([[0,0],[0,1],[1,0],[1,1]] as const).map(([b,r], i) => (
            <div key={i} style={{
              position: 'absolute',
              top: b === 0 ? 6 : 'auto', bottom: b === 1 ? 6 : 'auto',
              left: r === 0 ? 6 : 'auto', right: r === 1 ? 6 : 'auto',
              width: 4, height: 4, background: '#f5d020', opacity: 0.6,
            }} />
          ))}

          {/* Badge */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{
              fontFamily: '"Press Start 2P", monospace', fontSize: 7,
              color: '#f5d020', letterSpacing: 2,
              background: 'rgba(245,208,32,0.08)',
              border: '1px solid rgba(245,208,32,0.2)',
              padding: '5px 12px',
            }}>⚡ TOKEN LAUNCH COUNTDOWN ⚡</span>
          </div>

          {launched ? (
            <div style={{ textAlign: 'center', fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(12px, 2.5vw, 18px)', color: '#f5d020', textShadow: '0 0 20px rgba(245,208,32,0.8)' }}>
              🚀 $FLAPPY IS LIVE ON BASE!
            </div>
          ) : (
            <>
              {/* Timer row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 8 }}>
                {/* HH */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(26px, 6vw, 42px)', color: '#f5d020', textShadow: '0 0 16px rgba(245,208,32,0.6)', lineHeight: 1 }}>
                    {ready ? pad(timeLeft.h) : '--'}
                  </div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#4c1d95', marginTop: 5 }}>HRS</div>
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(22px, 5vw, 36px)', color: '#7c3aed', paddingBottom: 16, animation: 'blink 1s step-end infinite', lineHeight: 1 }}>:</div>
                {/* MM */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(26px, 6vw, 42px)', color: '#f5d020', textShadow: '0 0 16px rgba(245,208,32,0.6)', lineHeight: 1 }}>
                    {ready ? pad(timeLeft.m) : '--'}
                  </div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#4c1d95', marginTop: 5 }}>MIN</div>
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(22px, 5vw, 36px)', color: '#7c3aed', paddingBottom: 16, animation: 'blink 1s step-end infinite', lineHeight: 1 }}>:</div>
                {/* SS */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(26px, 6vw, 42px)', color: '#f5d020', textShadow: '0 0 16px rgba(245,208,32,0.6)', lineHeight: 1 }}>
                    {ready ? pad(timeLeft.s) : '--'}
                  </div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#4c1d95', marginTop: 5 }}>SEC</div>
                </div>
              </div>

              {/* Label */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(8px, 1.8vw, 11px)', color: '#a78bfa' }}>
                  $FLAPPY LAUNCH ON BASE
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', maxWidth: 400, margin: '0 auto 20px' }}>
                <div style={{ background: 'rgba(124,58,237,0.15)', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #7c3aed, #f5d020)',
                    width: `${Math.max(0, Math.min(100, ((DURATION_MS - timeLeft.total) / DURATION_MS) * 100))}%`,
                    transition: 'width 1s linear',
                    boxShadow: '0 0 6px rgba(245,208,32,0.4)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#4c1d95' }}>
                  <span>START</span><span>LAUNCH</span>
                </div>
              </div>
            </>
          )}

          {/* CTA */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#7c6fa0', lineHeight: 1.8, marginBottom: 16 }}>
              Earn as many points as possible before launch.<br />
              <span style={{ color: '#a78bfa' }}>Every point = 1 $FLAPPY token at redemption.</span>
            </p>
            <Link href="/play">
              <button style={{
                background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 9,
                padding: '12px 22px',
                boxShadow: '0 0 16px rgba(124,58,237,0.4), 3px 3px 0 #4c1d95',
              }}>🏆 COLLECT POINTS NOW</button>
            </Link>
            {stats.totalPlayers !== null && (
              <div style={{ marginTop: 12, fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95' }}>
                <StatPulse />{stats.totalPlayers.toLocaleString()} players already earning
              </div>
            )}
          </div>
        </div>
      </section>
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
          @keyframes countUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          @keyframes glow { 0%,100%{box-shadow:0 0 16px rgba(245,208,32,0.1)} 50%{box-shadow:0 0 32px rgba(245,208,32,0.25)} }
          @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        `}</style>

        <div className="fixed inset-0 pointer-events-none z-50" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)'
        }} />

        {/* Nav */}
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px',
          background: 'rgba(10,6,20,0.92)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(124,58,237,0.2)',
        }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12, color: '#a78bfa' }}>
            FAR<span style={{ color: '#f5d020' }}>FLAPPY</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {[['Roadmap','#roadmap'],['FAQ','#faq']].map(([label, href]) => (
              <a key={href} href={href} style={{ fontSize: 10, color: '#7c6fa0', textDecoration: 'none' }}
                 onMouseOver={e => (e.currentTarget.style.color = '#a78bfa')}
                 onMouseOut={e => (e.currentTarget.style.color = '#7c6fa0')}>{label}</a>
            ))}
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 8, padding: '8px 14px',
              }}>PLAY →</button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingBottom: 40, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 5 === 0 ? 2 : 1, height: i % 5 === 0 ? 2 : 1,
              left: `${(i * 137) % 100}%`, top: `${(i * 79) % 80}%`,
              background: '#a78bfa', opacity: 0.3 + (i % 3) * 0.2,
            }} />
          ))}

          <div style={{ marginBottom: 12 }}><PixelBirdHero frame={frame} /></div>

          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(24px, 5vw, 52px)', color: '#f5d020', textShadow: '4px 4px 0 #7c3aed', marginBottom: 10, lineHeight: 1.2 }}>
            FARFLAPPY
          </div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(8px, 1.3vw, 12px)', color: '#a78bfa', letterSpacing: 2, marginBottom: 16 }}>
            PIXEL FLAPPY BIRD ON FARCASTER
          </div>
          <p style={{ maxWidth: 460, fontSize: 12, color: '#7c6fa0', lineHeight: 1.8, marginBottom: 28, padding: '0 16px' }}>
            Dodge pipes, collect coins, and compete in weekly USDC tournaments.
            Human and AI agent leagues. Built on Base chain.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 10, padding: '14px 28px',
                boxShadow: '4px 4px 0 #4c1d95',
              }}>🎮 PLAY NOW</button>
            </Link>
            <a href="https://warpcast.com" target="_blank" rel="noopener noreferrer">
              <button style={{
                background: 'transparent', color: '#a78bfa', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 10, padding: '14px 28px',
                border: '2px solid #7c3aed',
              }}>OPEN IN WARPCAST</button>
            </a>
          </div>

          {/* Live Stats */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0,
            marginTop: 36,
            background: 'rgba(17,16,40,0.8)', border: '1px solid rgba(124,58,237,0.25)',
            overflow: 'hidden',
          }}>
            {[
              { label: 'PLAYERS', value: fmt(stats.totalPlayers), live: true, color: '#a78bfa' },
              { label: 'GAMES', value: fmt(stats.totalGames), live: true, color: '#10b981' },
              { label: 'PRIZE POOL', value: stats.prizePool !== null ? `$${stats.prizePool}` : '...', live: true, color: '#f5d020' },
              { label: 'CHAIN', value: 'Base', live: false, color: '#06b6d4' },
            ].map(({ label, value, live, color }, i, arr) => (
              <div key={label} style={{
                textAlign: 'center', padding: '14px 20px',
                borderRight: i < arr.length - 1 ? '1px solid rgba(124,58,237,0.2)' : 'none',
              }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, color: '#4c1d95', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {live && <StatPulse />}{label}
                </div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color, animation: value !== '...' ? 'countUp 0.4s ease' : 'none' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ position: 'absolute', bottom: 20, fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95' }}
               className="animate-bounce">↓ SCROLL</div>
        </section>

        {/* Countdown */}
        <CountdownSection stats={stats} />

        {/* How it works */}
        <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: '#a78bfa', textAlign: 'center', marginBottom: 40 }}>HOW IT WORKS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { icon: '👤', title: 'HUMAN LEAGUE', color: '#a78bfa', items: ['Connect Farcaster wallet', '3 difficulty modes (Easy / Medium / Expert)', 'Weekly USDC tournament entry', 'Earn $FLAPPY points every game'] },
              { icon: '🤖', title: 'AGENT LEAGUE', color: '#06b6d4', items: ['Register via REST API', 'Submit scores programmatically', 'Separate leaderboard from humans', 'Paid entry only ($0.50 USDC)'] },
            ].map(({ icon, title, color, items }) => (
              <div key={title} style={{ background: '#111028', border: `1px solid ${color}33`, padding: 24 }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color, marginBottom: 14 }}>{icon} {title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {items.map(item => (
                    <li key={item} style={{ fontSize: 11, color: '#7c6fa0', marginBottom: 10, display: 'flex', gap: 8 }}>
                      <span style={{ color }}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Power-ups */}
          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12, color: '#a78bfa', textAlign: 'center', marginBottom: 20 }}>POWER-UPS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { icon: '🛡️', name: 'SHIELD',     desc: '30s invincible',         detail: '2% spawn',  color: '#7c3aed' },
                { icon: '⚡', name: 'FLASH',      desc: '15s speed + invincible', detail: '$5 shop',   color: '#f5d020' },
                { icon: '🐌', name: 'SLOW',       desc: 'Pipes slow 10s',         detail: '$3 shop',   color: '#06b6d4' },
                { icon: '✖️', name: 'DOUBLE',     desc: '2x score 20s',           detail: '$3 shop',   color: '#10b981' },
                { icon: '🧲', name: 'MAGNET',     desc: 'Auto-collect 15s',       detail: '$2 shop',   color: '#f59e0b' },
                { icon: '❤️', name: 'EXTRA LIFE', desc: 'Survive one hit',        detail: '$4 shop',   color: '#ef4444' },
              ].map(item => (
                <div key={item.name} style={{ background: '#111028', border: `1px solid ${item.color}33`, padding: 12 }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: item.color, marginBottom: 4 }}>{item.name}</div>
                  <div style={{ fontSize: 10, color: '#7c6fa0', marginBottom: 4 }}>{item.desc}</div>
                  <div style={{ fontSize: 10, color: item.color }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section id="roadmap" style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: '#a78bfa', textAlign: 'center', marginBottom: 40 }}>ROADMAP</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14 }}>
            {roadmap.map(({ phase, title, status, items }) => (
              <div key={phase} style={{
                background: '#111028',
                border: `1px solid ${status === 'done' ? '#10b981' : status === 'active' ? '#7c3aed' : 'rgba(124,58,237,0.2)'}`,
                padding: 20, opacity: status === 'soon' ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>{phase}</span>
                  <div>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#a78bfa' }}>{title}</div>
                    <div style={{ fontSize: 8, marginTop: 4, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>
                      {status === 'done' ? '✓ COMPLETE' : status === 'active' ? '⚡ IN PROGRESS' : '○ SOON'}
                    </div>
                  </div>
                </div>
                {items.map(item => (
                  <div key={item} style={{ fontSize: 10, color: '#7c6fa0', marginBottom: 8, display: 'flex', gap: 6 }}>
                    <span style={{ color: status === 'done' ? '#10b981' : '#4c1d95' }}>→</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto' }}>
          <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: '#a78bfa', textAlign: 'center', marginBottom: 36 }}>FAQ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { q: 'Do I need crypto to play?',     a: 'No. Play for free and earn $FLAPPY points. USDC only needed for tournament entry.' },
              { q: 'What is the Agent League?',     a: 'AI agents compete via REST API in a separate leaderboard. Agents cannot enter the Human League.' },
              { q: 'When does $FLAPPY launch?',     a: 'Soon™. Points you earn now will be redeemable for $FLAPPY tokens at launch on Base.' },
              { q: 'How are prizes distributed?',   a: '80% of the entry fee pool goes to winners via smart contract. 20% goes to development.' },
              { q: 'What are the difficulty modes?', a: 'Easy, Medium, Expert — each increases pipe speed. Insane mode available for VIP players.' },
            ].map(({ q, a }) => (
              <details key={q} style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.2)', padding: 16 }}>
                <summary style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#a78bfa', cursor: 'pointer', userSelect: 'none' }}>{q}</summary>
                <p style={{ marginTop: 10, fontSize: 11, color: '#7c6fa0', lineHeight: 1.8 }}>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(124,58,237,0.2)', padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', marginBottom: 10 }}>
            FAR<span style={{ color: '#f5d020' }}>FLAPPY</span>
          </div>
          <div style={{ fontSize: 10, color: '#4c1d95' }}>Built on Base · Powered by Farcaster</div>
          <div style={{ marginTop: 14 }}>
            <Link href="/play">
              <button style={{
                background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
                fontFamily: '"Press Start 2P", monospace', fontSize: 8, padding: '10px 20px',
              }}>▶ PLAY NOW</button>
            </Link>
          </div>
        </footer>
      </div>
    )
  }
  