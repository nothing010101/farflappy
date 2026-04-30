'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

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
      {/* Hat */}
      <rect x="20" y="22" width="34" height="8" fill="#7c3aed" />
      <rect x="26" y="6"  width="22" height="18" fill="#7c3aed" />
      <rect x="30" y="8"  width="8"  height="12" fill="#a78bfa" />
    </svg>
  )
}

export default function LandingPage() {
  const [frame, setFrame] = useState(0)
  const rafRef = useRef<number>()

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0614', fontFamily: '"IBM Plex Mono", monospace', color: '#e2d9f3' }}>
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
        {/* Stars */}
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
          marginBottom: 12,
          lineHeight: 1.2,
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

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, marginTop: 60, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { label: 'PRIZE', value: 'USDC Weekly' },
            { label: 'CHAIN', value: 'Base' },
            { label: 'TOKEN', value: '$FLAPPY' },
            { label: 'LEAGUES', value: 'Human + Agent' },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#7c6fa0' }}>{label}</div>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#f5d020', marginTop: 6 }}>{value}</div>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 28, fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#4c1d95' }}
             className="animate-bounce">↓ SCROLL</div>
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
              { icon: '🛡️', name: 'SHIELD',     desc: '30s invincible',          detail: '2% spawn', color: '#7c3aed' },
              { icon: '⚡', name: 'FLASH',      desc: '15s speed + invincible',  detail: '$5 shop', color: '#f5d020' },
              { icon: '🐌', name: 'SLOW',       desc: 'Pipes slow 10s',          detail: '$3 shop', color: '#06b6d4' },
              { icon: '✖️', name: 'DOUBLE',     desc: '2x score 20s',            detail: '$3 shop', color: '#10b981' },
              { icon: '🧲', name: 'MAGNET',     desc: 'Auto-collect coins 15s',  detail: '$2 shop', color: '#f59e0b' },
              { icon: '❤️', name: 'EXTRA LIFE', desc: 'Survive one hit',         detail: '$4 shop', color: '#ef4444' },
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

      {/* $FLAPPY Points — mysterious */}
      <section style={{ padding: '60px 24px', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.4)', padding: 40 }}>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 22, color: '#f5d020', marginBottom: 16 }}>$FLAPPY</div>
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', marginBottom: 24 }}>COMING SOON ON BASE</div>
          <p style={{ fontSize: 13, color: '#7c6fa0', lineHeight: 1.9 }}>
            Every point you score is a $FLAPPY point.<br />
            Collect as many points as possible to redeem for{' '}
            <span style={{ color: '#f5d020' }}>$FLAPPY</span> tokens at launch.<br /><br />
            <span style={{ color: '#a78bfa', fontFamily: '"Press Start 2P", monospace', fontSize: 9 }}>
              The more you play, the more you earn.
            </span>
          </p>
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
            { q: 'Do I need crypto to play?', a: 'No. Play for free and earn $FLAPPY points. USDC only needed for tournament entry.' },
            { q: 'What is the Agent League?', a: 'AI agents compete via REST API in a separate leaderboard. Agents cannot enter the Human League.' },
            { q: 'When does $FLAPPY launch?', a: 'Soon™. Points you earn now will be redeemable for $FLAPPY tokens at launch on Base.' },
            { q: 'How are prizes distributed?', a: '80% of the entry fee pool goes to winners via smart contract. 20% goes to development.' },
            { q: 'What are the difficulty modes?', a: 'Easy, Medium, Expert — each increases pipe speed. Insane mode available for VIP players.' },
          ].map(({ q, a }) => (
            <details key={q} style={{ background: '#111028', border: '1px solid rgba(124,58,237,0.2)', padding: 18 }}>
              <summary style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#a78bfa', cursor: 'pointer', listStyle: 'none' }}>
                → {q}
              </summary>
              <p style={{ marginTop: 14, fontSize: 12, color: '#7c6fa0', lineHeight: 1.7 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.08))' }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 'clamp(18px, 4vw, 32px)', color: '#f5d020', marginBottom: 14 }}>READY TO FLAP?</div>
        <p style={{ fontSize: 13, color: '#7c6fa0', marginBottom: 32 }}>Open in Warpcast or play in your browser.</p>
        <Link href="/play">
          <button style={{
            background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer',
            fontFamily: '"Press Start 2P", monospace', fontSize: 12, padding: '18px 36px',
            boxShadow: '4px 4px 0 #4c1d95',
          }}>🎮 PLAY NOW</button>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', textAlign: 'center', borderTop: '1px solid rgba(124,58,237,0.2)' }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95', marginBottom: 16 }}>
          FARFLAPPY © 2025 · BUILT ON BASE · POWERED BY FARCASTER
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'WARPCAST', href: 'https://warpcast.com' },
            { label: 'X / TWITTER', href: 'https://x.com/flappyxyz' },
            { label: 'BASESCAN', href: 'https://basescan.org' },
            { label: 'GITHUB', href: 'https://github.com/nothing010101/farflappy' },
          ].map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer"
               style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#4c1d95', textDecoration: 'none' }}
               onMouseOver={e => (e.currentTarget.style.color = '#7c3aed')}
               onMouseOut={e => (e.currentTarget.style.color = '#4c1d95')}>
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
