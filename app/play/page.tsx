'use client'

  import { useState, useEffect } from 'react'
  import { useAccount, useConnect } from 'wagmi'
  import { sdk } from '@farcaster/miniapp-sdk'
  import { usePlayerStore } from '@/store/playerStore'
  import dynamic from 'next/dynamic'

  const HomeScreen = dynamic(() => import('@/components/HomeScreen'), { ssr: false })
  const GameWrapper = dynamic(() => import('@/components/game/GameWrapper'), { ssr: false })
  const Leaderboard = dynamic(() => import('@/components/Leaderboard'), { ssr: false })
  const Profile = dynamic(() => import('@/components/Profile'), { ssr: false })
  const Shop = dynamic(() => import('@/components/Shop'), { ssr: false })
  const Tournament = dynamic(() => import('@/components/Tournament'), { ssr: false })
  const AgentDocs = dynamic(() => import('@/components/AgentDocs'), { ssr: false })

  type Tab = 'home' | 'game' | 'leaderboard' | 'tournament' | 'shop' | 'profile' | 'agent'

  export default function Home() {
    const [tab, setTab] = useState<Tab>('home')
    const [activeTournamentId, setActiveTournamentId] = useState<string | null>(null)
    const { address, isConnected } = useAccount()
    const { connect, connectors } = useConnect()
    const { fetchOrCreatePlayer, player } = usePlayerStore()

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
  