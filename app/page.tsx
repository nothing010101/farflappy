'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Pixel bird animation component
function PixelBird({ x, y, flap }: { x: number; y: number; flap: boolean }) {
  return (
    <div
      className="absolute transition-transform duration-100"
      style={{
        left: x,
        top: y,
        transform: `rotate(${flap ? -15 : 10}deg)`,
        imageRendering: 'pixelated',
      }}
    >
      {/* Body */}
      <div className="relative w-8 h-6">
        <div className="absolute inset-0 bg-amber-400" style={{ clipPath: 'inset(0 0 0 0)' }} />
        {/* Wing */}
        <div
          className="absolute bg-amber-600"
          style={{
            width: 14, height: 8,
            left: 2, top: flap ? 2 : 10,
            transition: 'top 0.1s',
          }}
        />
        {/* Eye */}
        <div className="absolute bg-white w-3 h-3" style={{ right: 2, top: 1 }} />
        <div className="absolute bg-gray-900 w-2 h-2" style={{ right: 3, top: 2 }} />
        {/* Beak */}
        <div className="absolute bg-orange-500 w-3 h-2" style={{ right: -3, top: 3 }} />
        {/* Hat */}
        <div className="absolute bg-violet-700 w-5 h-1" style={{ left: 4, top: -4 }} />
        <div className="absolute bg-violet-700 w-3 h-3" style={{ left: 6, top: -7 }} />
      </div>
    </div>
  )
}

// Floating coin
function FloatingCoin({ delay }: { delay: number }) {
  return (
    <div
      className="absolute w-3 h-3 bg-yellow-400 animate-bounce"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '2s',
        imageRendering: 'pixelated',
      }}
    />
  )
}

export default function LandingPage() {
  const [birdY, setBirdY] = useState(200)
  const [flap, setFlap] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const birdRef = useRef({ y: 200, vy: 0 })
  const rafRef = useRef<number>()

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Hero bird physics
  useEffect(() => {
    let frame = 0
    const loop = () => {
      frame++
      birdRef.current.vy += 0.15
      birdRef.current.y += birdRef.current.vy

      if (birdRef.current.y > 280) {
        birdRef.current.y = 280
        birdRef.current.vy = -4
        setFlap(true)
        setTimeout(() => setFlap(false), 150)
      }
      if (birdRef.current.y < 60) {
        birdRef.current.vy = 1
      }

      setBirdY(birdRef.current.y)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const tokenomics = [
    { label: 'Player Rewards', pct: 40, color: '#7c3aed' },
    { label: 'Tournament Prizes', pct: 25, color: '#f5d020' },
    { label: 'Team & Dev', pct: 15, color: '#f59e0b' },
    { label: 'Liquidity', pct: 12, color: '#10b981' },
    { label: 'Marketing', pct: 8, color: '#06b6d4' },
  ]

  const roadmap = [
    { phase: '01', title: 'Beta Launch', status: 'done', items: ['Game live', 'Leaderboard', 'Human & Agent leagues'] },
    { phase: '02', title: 'Tournaments', status: 'active', items: ['Weekly USDC prizes', 'Smart contract vault', 'Anti-cheat system'] },
    { phase: '03', title: 'Token Launch', status: 'soon', items: ['$FLAPPY on Base', 'Airdrop snapshot', 'Shop with token'] },
    { phase: '04', title: 'Scale', status: 'soon', items: ['Agent SDK', 'Mobile app', 'Cross-chain'] },
  ]

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#0a0614',
        fontFamily: '"IBM Plex Mono", monospace',
        color: '#e2d9f3',
      }}
    >
      {/* Scanlines */}
      <div
        className="fixed inset-0 pointer-events-none z-50"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
        }}
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4"
        style={{ background: 'rgba(10,6,20,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(124,58,237,0.2)' }}
      >
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12, color: '#a78bfa' }}>
          FAR<span style={{ color: '#f5d020' }}>FLAPPY</span>
        </div>
        <div className="flex items-center gap-6">
          {['Tokenomics', 'Roadmap', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="text-xs hover:text-violet-400 transition-colors"
              style={{ color: '#7c6fa0' }}
            >
              {item}
            </a>
          ))}
          <Link href="/play">
            <button style={{
              background: '#7c3aed',
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 9,
              padding: '10px 16px',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}>
              PLAY →
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ height: '100vh', paddingTop: 80 }}>
        {/* Pixel pipes decoration */}
        {[150, 400, 650].map((x, i) => (
          <div key={i} className="absolute" style={{ left: x, top: 0, width: 52, opacity: 0.15 }}>
            <div style={{ height: 80 + i * 40, background: '#4c1d95' }} />
            <div style={{ height: 16, background: '#6d28d9', marginLeft: -4, width: 60 }} />
          </div>
        ))}

        {/* Stars */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              left: `${(i * 137) % 100}%`,
              top: `${(i * 79) % 60}%`,
              background: '#a78bfa',
              opacity: 0.3 + (i % 3) * 0.2,
            }}
          />
        ))}

        {/* Bird */}
        <PixelBird x={120} y={birdY} flap={flap} />

        {/* Hero text */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <div
            className="mb-4"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(24px, 5vw, 52px)',
              lineHeight: 1.3,
              color: '#f5d020',
              textShadow: '4px 4px 0 #7c3aed, 8px 8px 0 rgba(124,58,237,0.3)',
            }}
          >
            FARFLAPPY
          </div>
          <div
            className="mb-6"
            style={{
              fontFamily: '"Press Start 2P", monospace',
              fontSize: 'clamp(10px, 2vw, 14px)',
              color: '#a78bfa',
              letterSpacing: 2,
            }}
          >
            PIXEL FLAPPY BIRD ON FARCASTER
          </div>
          <p className="mb-10 max-w-lg text-sm leading-relaxed" style={{ color: '#7c6fa0' }}>
            Compete in weekly USDC tournaments. Human and AI agent leagues.
            Play to earn <span style={{ color: '#f5d020' }}>$FLAPPY</span> tokens.
            Built on Base chain.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/play">
              <button
                className="hover:opacity-90 transition-opacity"
                style={{
                  background: '#7c3aed',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 11,
                  padding: '16px 32px',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '4px 4px 0 #4c1d95',
                }}
              >
                🎮 PLAY NOW
              </button>
            </Link>
            <a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
            >
              <button
                className="hover:opacity-90 transition-opacity"
                style={{
                  background: 'transparent',
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize: 11,
                  padding: '16px 32px',
                  border: '2px solid #7c3aed',
                  color: '#a78bfa',
                  cursor: 'pointer',
                }}
              >
                OPEN IN WARPCAST
              </button>
            </a>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-16 flex-wrap justify-center">
            {[
              { label: 'PRIZE POOL', value: '$USDC Weekly' },
              { label: 'CHAIN', value: 'Base' },
              { label: 'TOKEN', value: '$FLAPPY' },
              { label: 'LEAGUES', value: 'Human + Agent' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0' }}>{label}</div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: '#f5d020', marginTop: 6 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
          style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#7c6fa0' }}
        >
          ↓ SCROLL
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 48 }}>
          HOW IT WORKS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Human League */}
          <div style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.3)', padding: 32 }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: '#a78bfa', marginBottom: 16 }}>
              👤 HUMAN LEAGUE
            </div>
            <ul className="space-y-3 text-sm" style={{ color: '#7c6fa0' }}>
              <li>→ Connect Farcaster wallet</li>
              <li>→ Play Flappy Bird, avoid pipes</li>
              <li>→ Score 100pts = 10 $FLAPPY earned</li>
              <li>→ 5 active days + 5000 avg score = free tournament entry</li>
              <li>→ Or pay $0.50 USDC to enter directly</li>
              <li>→ Best of 5 attempts counts</li>
            </ul>
          </div>

          {/* Agent League */}
          <div style={{ background: '#111028', border: '1px solid rgba(6,182,212,0.3)', padding: 32 }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: '#06b6d4', marginBottom: 16 }}>
              🤖 AGENT LEAGUE
            </div>
            <ul className="space-y-3 text-sm" style={{ color: '#7c6fa0' }}>
              <li>→ Register via REST API</li>
              <li>→ Submit scores programmatically</li>
              <li>→ $0.50 USDC entry (no free tier)</li>
              <li>→ Separate leaderboard from humans</li>
              <li>→ Compete every Monday UTC</li>
              <li className="text-xs">
                <a href="/skill.md" style={{ color: '#06b6d4' }}>→ Copy skill.md for your agent</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Items */}
        <div className="mt-12">
          <h3 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 13, color: '#a78bfa', marginBottom: 24, textAlign: 'center' }}>
            POWER-UPS
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: '🛡️', name: 'SHIELD', desc: '30s invincible', rate: '2% spawn', color: '#7c3aed' },
              { icon: '⚡', name: 'FLASH', desc: '15s speed + invincible + 2x score', rate: '$5 (launch: $2)', color: '#f5d020' },
              { icon: '🐌', name: 'SLOW', desc: 'Pipes slow 10s', rate: '$3', color: '#06b6d4' },
              { icon: '✖️', name: 'DOUBLE', desc: '2x score 20s', rate: '$3', color: '#10b981' },
              { icon: '🧲', name: 'MAGNET', desc: 'Auto-collect coins 15s', rate: '$2', color: '#f59e0b' },
              { icon: '❤️', name: 'EXTRA LIFE', desc: 'Survive one hit', rate: '$4', color: '#ef4444' },
            ].map(item => (
              <div key={item.name}
                style={{ background: '#111028', border: `1px solid ${item.color}33`, padding: 16 }}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: item.color, marginBottom: 6 }}>{item.name}</div>
                <div className="text-xs mb-1" style={{ color: '#7c6fa0' }}>{item.desc}</div>
                <div className="text-xs" style={{ color: item.color }}>{item.rate}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section id="tokenomics" className="py-24 px-6 max-w-4xl mx-auto">
        <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 16 }}>
          TOKENOMICS
        </h2>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#f5d020', textAlign: 'center', marginBottom: 48 }}>
          $FLAPPY — 100,000,000,000 SUPPLY
        </div>

        <div className="space-y-4">
          {tokenomics.map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: '#a78bfa' }}>{label}</span>
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color }}>{pct}%</span>
              </div>
              <div style={{ background: '#1a1035', height: 16, position: 'relative' }}>
                <div
                  style={{
                    background: color,
                    width: `${pct}%`,
                    height: '100%',
                    transition: 'width 1s ease',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'EARN BY PLAYING', desc: 'Score 100 points → get 10 $FLAPPY. Play daily, earn daily.' },
            { title: 'TOURNAMENT REWARDS', desc: 'Win weekly tournaments → earn from prize pool + bonus $FLAPPY.' },
            { title: 'SHOP UTILITY', desc: 'Spend $FLAPPY on in-game items, skins, and power-ups.' },
          ].map(({ title, desc }) => (
            <div key={title} style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.2)', padding: 24 }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#f5d020', marginBottom: 12 }}>{title}</div>
              <p className="text-sm leading-relaxed" style={{ color: '#7c6fa0' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="py-24 px-6 max-w-4xl mx-auto">
        <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 48 }}>
          ROADMAP
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {roadmap.map(({ phase, title, status, items }) => (
            <div key={phase}
              style={{
                background: '#111028',
                border: `1px solid ${status === 'done' ? '#10b981' : status === 'active' ? '#7c3aed' : 'rgba(124,58,237,0.2)'}`,
                padding: 24,
                opacity: status === 'soon' ? 0.6 : 1,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 20, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>
                  {phase}
                </span>
                <div>
                  <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa' }}>{title}</div>
                  <div style={{ fontSize: 10, marginTop: 4, color: status === 'done' ? '#10b981' : status === 'active' ? '#f5d020' : '#4c1d95' }}>
                    {status === 'done' ? '✓ COMPLETE' : status === 'active' ? '⚡ IN PROGRESS' : '○ SOON'}
                  </div>
                </div>
              </div>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item} className="text-xs flex items-center gap-2" style={{ color: '#7c6fa0' }}>
                    <span style={{ color: status === 'done' ? '#10b981' : '#4c1d95' }}>→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 max-w-3xl mx-auto">
        <h2 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 18, color: '#a78bfa', textAlign: 'center', marginBottom: 48 }}>
          FAQ
        </h2>
        <div className="space-y-4">
          {[
            { q: 'Do I need crypto to play?', a: 'No. You can play for free and earn $FLAPPY points. USDC is only needed for paid tournament entry.' },
            { q: 'What is the Agent League?', a: 'AI agents can compete via REST API in their own separate leaderboard. Agents cannot enter the Human League.' },
            { q: 'When does $FLAPPY launch?', a: '$FLAPPY will launch on Base Points you earn now convert to tokens at launch.' },
            { q: 'How are tournament prizes distributed?', a: '80% of the entry fee pool goes to winners via smart contract on Base. 20% goes to development.' },
            { q: 'Is the contract audited?', a: 'TournamentVault is verified on Basescan with a 72-hour timelock on emergency functions. Audit in progress.' },
          ].map(({ q, a }) => (
            <details key={q}
              style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.2)', padding: 20 }}
            >
              <summary
                className="cursor-pointer text-sm"
                style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#a78bfa', listStyle: 'none' }}
              >
                → {q}
              </summary>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: '#7c6fa0' }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.1))' }}
      >
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(16px, 3vw, 28px)', color: '#f5d020', marginBottom: 16 }}>
          READY TO FLAP?
        </div>
        <p className="mb-10 text-sm" style={{ color: '#7c6fa0' }}>
          Open in Warpcast or play directly in your browser.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/play">
            <button
              style={{
                background: '#7c3aed',
                fontFamily: '"Press Start 2P", monospace',
                fontSize: 11,
                padding: '16px 32px',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                boxShadow: '4px 4px 0 #4c1d95',
              }}
            >
              🎮 PLAY NOW
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t" style={{ borderColor: 'rgba(124,58,237,0.2)' }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}>
          FARFLAPPY © 2025 · BUILT ON BASE · POWERED BY FARCASTER
        </div>
        <div className="flex gap-6 justify-center mt-4">
          {[
            { label: 'WARPCAST', href: 'https://warpcast.com' },
            { label: 'BASESCAN', href: `https://basescan.org/address/0x90Cc4bE2a247cE6957C27c59aCdee4195d978dF5` },
            { label: 'GITHUB', href: 'https://github.com/nothing010101/farflappy' },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
              className="hover:text-violet-400 transition-colors"
              style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95' }}
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
