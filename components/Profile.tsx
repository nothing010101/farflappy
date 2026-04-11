'use client'

import { usePlayerStore } from '@/store/playerStore'
import { useAccount } from 'wagmi'

export default function Profile() {
  const { player } = usePlayerStore()
  const { address } = useAccount()

  if (!player) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-text-muted pixel-font" style={{ fontSize: 8 }}>
          CONNECT WALLET TO VIEW PROFILE
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'TOTAL SCORE', value: player.total_score.toLocaleString(), color: 'text-pixel' },
    { label: 'GAMES PLAYED', value: player.games_played, color: 'text-farcaster-light' },
    { label: 'ACTIVE DAYS', value: player.active_days, color: 'text-green-400' },
    { label: 'STREAK', value: `${player.streak_days} 🔥`, color: 'text-orange-400' },
  ]

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Avatar + name */}
      <div className="card p-4 flex items-center gap-4">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt="avatar"
            className="w-14 h-14 rounded-full border-2 border-farcaster" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-farcaster/30 flex items-center justify-center text-2xl">
            🐦
          </div>
        )}
        <div>
          <div className="pixel-font text-farcaster-light text-xs">{player.username}</div>
          {player.fid && (
            <div className="text-text-muted text-xs mt-1">FID #{player.fid}</div>
          )}
          <div className="text-text-muted text-xs mt-1">
            {player.wallet_address.slice(0, 6)}...{player.wallet_address.slice(-4)}
          </div>
          <div className={`text-xs mt-1 ${player.player_type === 'agent' ? 'text-cyan-400' : 'text-green-400'}`}>
            {player.player_type === 'agent' ? '🤖 AGENT' : '👤 HUMAN'}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, color }) => (
          <div key={label} className="card p-3">
            <div className="text-text-muted" style={{ fontSize: 8, fontFamily: '"Press Start 2P", monospace' }}>
              {label}
            </div>
            <div className={`pixel-font text-sm mt-2 ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Items inventory */}
      <div className="card p-4">
        <div className="pixel-font text-text-muted mb-3" style={{ fontSize: 8 }}>INVENTORY</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(player.items).map(([key, count]) => (
            <div key={key} className="bg-bg-secondary rounded p-2 text-center">
              <div className="text-xs text-text-muted capitalize">{key}</div>
              <div className="pixel-font text-pixel text-sm mt-1">x{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* $FLAPPY Points — mysterious */}
      <div className="card p-4 border-farcaster/50">
        <div className="pixel-font text-farcaster-light mb-2" style={{ fontSize: 8 }}>
          🪂 $FLAPPY POINTS
        </div>
        <div className="text-center my-3">
          <span className="pixel-font text-yellow-400 text-xl">{player.flappy_points.toLocaleString()}</span>
          <span className="text-text-muted text-xs ml-2">pts</span>
        </div>
        <div className="text-xs text-text-muted leading-relaxed text-center" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
          Collect as many points as possible to redeem for <span className="text-yellow-400">$FLAPPY</span> at launch.
        </div>
      </div>

      {/* Skill.md for agents */}
      {player.player_type === 'agent' && (
        <div className="card p-4 border-cyan-400/30">
          <div className="pixel-font text-cyan-400 mb-2" style={{ fontSize: 8 }}>🤖 AGENT API</div>
          <div className="text-xs text-text-muted">
            <a href="/skill.md" className="text-cyan-400 underline">farflappy.xyz/skill.md</a>
          </div>
        </div>
      )}
    </div>
  )
}
