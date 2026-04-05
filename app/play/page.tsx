'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk'
import { usePlayerStore } from '@/store/playerStore'
import dynamic from 'next/dynamic'

const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'), { ssr: false })
const Leaderboard = dynamic(() => import('@/components/Leaderboard'), { ssr: false })
const Profile = dynamic(() => import('@/components/Profile'), { ssr: false })
const Shop = dynamic(() => import('@/components/Shop'), { ssr: false })
const Tournament = dynamic(() => import('@/components/Tournament'), { ssr: false })

type Tab = 'game' | 'leaderboard' | 'tournament' | 'shop' | 'profile'

export default function Home() {
  const [tab, setTab] = useState<Tab>('game')
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { fetchOrCreatePlayer, player } = usePlayerStore()

  // Auto-connect via Farcaster SDK
  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context
        if (context?.user && connectors[0]) {
          connect({ connector: connectors[0] })
        }
      } catch (e) {
        console.error(e)
      }
    }
    init()
  }, [connect, connectors])

  // Fetch/create player after wallet connects
  useEffect(() => {
    if (!address) return
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
  }, [address, fetchOrCreatePlayer])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'game', label: 'PLAY', icon: '🎮' },
    { key: 'leaderboard', label: 'RANKS', icon: '🏆' },
    { key: 'tournament', label: 'EVENT', icon: '⚔️' },
    { key: 'shop', label: 'SHOP', icon: '🛒' },
    { key: 'profile', label: 'ME', icon: '👤' },
  ]

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: '#0f0a1e', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-farcaster/20">
        <div className="pixel-font text-farcaster-light text-xs tracking-wider">
          FAR<span className="text-pixel">FLAPPY</span>
        </div>

        {!isConnected ? (
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
        {tab === 'game' && <GameWrapper />}
        {tab === 'leaderboard' && <Leaderboard />}
        {tab === 'tournament' && <Tournament />}
        {tab === 'shop' && <Shop />}
        {tab === 'profile' && <Profile />}
      </div>

      {/* Bottom nav */}
      <div className="border-t border-farcaster/20 flex">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              tab === key
                ? 'text-farcaster-light bg-farcaster/10'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="text-base">{icon}</span>
            <span className="pixel-font text-xs" style={{ fontSize: 7 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
