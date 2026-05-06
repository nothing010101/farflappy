'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'
import { usePlayerStore } from '@/store/playerStore'
import dynamic from 'next/dynamic'

const HomeScreen  = dynamic(() => import('@/components/HomeScreen'),         { ssr: false })
const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'),   { ssr: false })
const Leaderboard = dynamic(() => import('@/components/Leaderboard'),        { ssr: false })
const Profile     = dynamic(() => import('@/components/Profile'),            { ssr: false })
const Shop        = dynamic(() => import('@/components/Shop'),               { ssr: false })
const Tournament  = dynamic(() => import('@/components/Tournament'),         { ssr: false })
const AgentDocs   = dynamic(() => import('@/components/AgentDocs'),          { ssr: false })

type Tab = 'home' | 'game' | 'leaderboard' | 'tournament' | 'shop' | 'profile' | 'agent'

const GUEST_KEY = 'farflappy_guest'

function isValidEVM(addr: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(addr.trim())
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('home')
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null)
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { fetchOrCreatePlayer, player } = usePlayerStore()

  // Guest login state
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestNickname, setGuestNickname] = useState('')
  const [guestWallet, setGuestWallet] = useState('')
  const [guestError, setGuestError] = useState('')
  const [guestLoading, setGuestLoading] = useState(false)
  const [isFarcaster, setIsFarcaster] = useState(false)
  const initDone = useRef(false)

  // Auto-init: try Farcaster, else check localStorage guest
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    const init = async () => {
      try {
        const context = await sdk.context
        if (context?.user && connectors[0]) {
          setIsFarcaster(true)
          connect({ connector: connectors[0] })
          return
        }
      } catch {}
      // Not in Farcaster — check saved guest
      const saved = localStorage.getItem(GUEST_KEY)
      if (saved) {
        try {
          const { nickname, wallet } = JSON.parse(saved)
          if (nickname && isValidEVM(wallet)) {
            await fetchOrCreatePlayer({ wallet, username: nickname })
            return
          }
        } catch {}
        localStorage.removeItem(GUEST_KEY)
      }
      setShowGuestForm(true)
    }
    init()
  }, [connect, connectors, fetchOrCreatePlayer])

  // Farcaster wallet connected → fetch player
  useEffect(() => {
    if (!address || !isFarcaster) return
    const init = async () => {
      try {
        const context = await sdk.context
        await fetchOrCreatePlayer({
          wallet: address,
          fid: context?.user?.fid,
          username: context?.user?.username,
          avatarUrl: context?.user?.pfpUrl,
        })
      } catch {
        await fetchOrCreatePlayer({ wallet: address })
      }
    }
    init()
  }, [address, isFarcaster, fetchOrCreatePlayer])

  const handleGuestLogin = async () => {
    setGuestError('')
    const nick = guestNickname.trim()
    const w = guestWallet.trim()
    if (!nick || nick.length < 2) { setGuestError('Nickname minimal 2 karakter'); return }
    if (!isValidEVM(w)) { setGuestError('Wallet address tidak valid (0x...)'); return }
    setGuestLoading(true)
    try {
      await fetchOrCreatePlayer({ wallet: w, username: nick })
      localStorage.setItem(GUEST_KEY, JSON.stringify({ nickname: nick, wallet: w }))
      setShowGuestForm(false)
    } catch (e) {
      setGuestError('Gagal login, coba lagi')
    }
    setGuestLoading(false)
  }

  const handleGuestLogout = () => {
    localStorage.removeItem(GUEST_KEY)
    usePlayerStore.setState({ player: null })
    setGuestNickname('')
    setGuestWallet('')
    setShowGuestForm(true)
  }

  const handleTournamentPlay = (tournamentId: string) => {
    setActiveTournamentId(tournamentId)
    setTab('game')
  }

  const handleTournamentDone = () => {
    setActiveTournamentId(null)
    setTab('tournament')
  }

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'home',        icon: '🏠', label: 'HOME' },
    { key: 'game',        icon: '🎮', label: 'PLAY' },
    { key: 'leaderboard', icon: '🏆', label: 'RANKS' },
    { key: 'tournament',  icon: '⚔️',  label: 'EVENT' },
    { key: 'shop',        icon: '🛒', label: 'SHOP' },
    { key: 'agent',       icon: '🤖', label: 'AGENT' },
    { key: 'profile',     icon: '👤', label: 'ME' },
  ]

  const isLoggedIn = !!player
  const isGuest = isLoggedIn && !isFarcaster && !isConnected

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: '#0f0a1e', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Guest Login Modal */}
      {showGuestForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(15,10,30,0.97)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 360 }}>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 14, color: '#c084fc', textAlign: 'center', marginBottom: 8 }}>
              FARFLAPPY
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#a78bfa', textAlign: 'center', marginBottom: 32 }}>
              GUEST LOGIN
            </div>

            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
              NICKNAME
            </label>
            <input
              type="text"
              placeholder="e.g. CryptoFarmer"
              value={guestNickname}
              onChange={e => setGuestNickname(e.target.value)}
              maxLength={20}
              style={{
                width: '100%', padding: '10px 12px',
                background: '#1a1030', border: '1px solid #4c1d95',
                borderRadius: 6, color: '#e2e8f0', fontFamily: 'monospace',
                fontSize: 14, marginBottom: 16, boxSizing: 'border-box',
              }}
            />

            <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
              EVM WALLET ADDRESS
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={guestWallet}
              onChange={e => setGuestWallet(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px',
                background: '#1a1030', border: '1px solid #4c1d95',
                borderRadius: 6, color: '#e2e8f0', fontFamily: 'monospace',
                fontSize: 12, marginBottom: 8, boxSizing: 'border-box',
              }}
            />

            {guestError && (
              <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 11, marginBottom: 12 }}>
                ⚠ {guestError}
              </div>
            )}

            <button
              onClick={handleGuestLogin}
              disabled={guestLoading}
              style={{
                width: '100%', padding: '12px',
                background: guestLoading ? '#4c1d95' : '#7c3aed',
                border: 'none', borderRadius: 6,
                color: '#fff', fontFamily: '"Press Start 2P", monospace',
                fontSize: 10, cursor: guestLoading ? 'not-allowed' : 'pointer',
                marginBottom: 16,
              }}
            >
              {guestLoading ? 'LOADING...' : 'START PLAYING'}
            </button>

            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#4b5563', textAlign: 'center' }}>
              No wallet? Use any valid 0x address to track your scores.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-farcaster/20">
        <div className="pixel-font text-farcaster-light text-xs tracking-wider">
          FAR<span className="text-pixel">FLAPPY</span>
        </div>
        {isGuest ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-mono">
              {player?.username?.slice(0, 12)}
            </span>
            <button
              onClick={handleGuestLogout}
              style={{ fontSize: 9, fontFamily: 'monospace', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              [exit]
            </button>
          </div>
        ) : !isConnected ? (
          <button
            className="btn-primary text-xs py-2 px-3"
            onClick={() => connect({ connector: connectors[0] })}
          >
            CONNECT
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {player && (
              <span className="text-xs text-text-muted font-mono">
                {player.username?.slice(0, 12)}
              </span>
            )}
            <div className="w-2 h-2 rounded-full bg-green-400" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'home' && (
          <HomeScreen
            onPlay={() => setTab('game')}
            onTab={(t) => setTab(t as Tab)}
          />
        )}
        {tab === 'game' && (
          <GameWrapper
            sessionType={activeTournamentId ? 'tournament' : 'casual'}
            tournamentId={activeTournamentId}
            onDone={activeTournamentId ? handleTournamentDone : undefined}
          />
        )}
        {tab === 'leaderboard' && <Leaderboard />}
        {tab === 'tournament' && <Tournament onPlay={handleTournamentPlay} />}
        {tab === 'shop' && <Shop />}
        {tab === 'agent' && <AgentDocs />}
        {tab === 'profile' && <Profile />}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-farcaster/20 flex overflow-x-auto">
        {tabs.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'game') setActiveTournamentId(null)
              setTab(key)
            }}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors min-w-0 ${
              tab === key
                ? 'text-farcaster-light bg-farcaster/10'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 6, whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
