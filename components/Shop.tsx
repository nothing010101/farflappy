'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/lib/supabase'
import { useShopPurchase, ITEM_PRICES_USD, ITEM_DISCOUNTS } from '@/hooks/useShopPurchase'
import { usePlayerStore } from '@/store/playerStore'

interface ShopItem {
  item_key: string
  name: string
  description: string
  price_usd: number
  discounted_price_usd: number | null
  discount_until: string | null
  duration_seconds: number | null
  score_multiplier: number
  spawn_rate: number
}

const ITEM_ICONS: Record<string, string> = {
  flash:     '⚡',
  slow:      '🐌',
  double:    '✖️',
  magnet:    '🧲',
  extralife: '❤️',
  vip:       '👑',
}

const ITEM_COLORS: Record<string, string> = {
  flash:     '#f5d020',
  slow:      '#06b6d4',
  double:    '#10b981',
  magnet:    '#f59e0b',
  extralife: '#ef4444',
  vip:       '#a78bfa',
}

const STATUS_LABELS: Record<string, string> = {
  idle:       '',
  sending:    'Sending USDC...',
  confirming: 'Confirming tx...',
  verifying:  'Verifying...',
  done:       '✓ Item added to inventory!',
  error:      '',
}

function ItemCard({ item }: { item: ShopItem }) {
  const { purchase, status, errorMsg, reset } = useShopPurchase()
  const { player } = usePlayerStore()
  const { isConnected } = useAccount()

  const isDiscounted = item.discounted_price_usd && item.discount_until && new Date(item.discount_until) > new Date()
  const displayPrice = isDiscounted ? item.discounted_price_usd! : item.price_usd
  const color = ITEM_COLORS[item.item_key] || '#7c3aed'
  const icon = ITEM_ICONS[item.item_key] || '📦'
  const loading = ['sending', 'confirming', 'verifying'].includes(status)
  const owned = player?.items?.[item.item_key] || 0
  const isVipOwned = item.item_key === 'vip' && owned > 0

  return (
    <div style={{
      background: '#111028',
      border: `1px solid ${color}33`,
      borderRadius: 4,
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>{icon}</span>
          <div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color }}>{item.name}</div>
            {owned > 0 && (
              <div style={{ fontSize: 9, color: '#10b981', marginTop: 3, fontFamily: '"IBM Plex Mono", monospace' }}>
                {isVipOwned ? '✓ OWNED' : `In inventory: ${owned}`}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          {isDiscounted && (
            <div style={{ fontSize: 9, color: '#7c6fa0', textDecoration: 'line-through', fontFamily: '"IBM Plex Mono", monospace' }}>
              ${item.price_usd}
            </div>
          )}
          <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, color: isDiscounted ? '#10b981' : color }}>
            ${displayPrice}
          </div>
          {isDiscounted && (
            <div style={{ fontSize: 8, color: '#10b981', fontFamily: '"Press Start 2P", monospace' }}>SALE!</div>
          )}
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 10, color: '#7c6fa0', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.5 }}>
        {item.description}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 9, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>
        {item.duration_seconds && <span>⏱ {item.duration_seconds}s</span>}
        {item.score_multiplier > 1 && <span style={{ color: '#10b981' }}>x{item.score_multiplier} score</span>}
        {item.spawn_rate > 0 && <span>🎲 {(item.spawn_rate * 100).toFixed(1)}% spawn</span>}
      </div>

      {/* Status message */}
      {status === 'done' && (
        <div style={{ fontSize: 9, color: '#10b981', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace' }}>
          ✓ Item added to inventory!
        </div>
      )}
      {status === 'error' && errorMsg && (
        <div style={{ fontSize: 9, color: '#ef4444', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace' }}>
          ✗ {errorMsg}
        </div>
      )}
      {loading && (
        <div style={{ fontSize: 9, color: '#a78bfa', marginBottom: 8, fontFamily: '"IBM Plex Mono", monospace' }}>
          ⏳ {STATUS_LABELS[status]}
        </div>
      )}

      {/* Buy button */}
      {isVipOwned ? (
        <div style={{
          textAlign: 'center', padding: '10px',
          fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#a78bfa',
          border: '1px solid rgba(167,139,250,0.3)', borderRadius: 4,
        }}>
          👑 VIP ACTIVE
        </div>
      ) : (
        <button
          onClick={() => status === 'error' ? reset() : purchase(item.item_key)}
          disabled={loading || !isConnected || status === 'done'}
          style={{
            width: '100%',
            background: loading || status === 'done' ? '#1a1035' : color,
            border: 'none',
            padding: '12px',
            fontFamily: '"Press Start 2P", monospace',
            fontSize: 9,
            color: loading || status === 'done' ? '#7c6fa0' : '#0f0a1e',
            cursor: loading || !isConnected || status === 'done' ? 'not-allowed' : 'pointer',
            borderRadius: 4,
            transition: 'all 0.15s',
          }}
        >
          {!isConnected
            ? 'CONNECT WALLET'
            : status === 'error'
            ? 'TRY AGAIN'
            : status === 'done'
            ? '✓ PURCHASED'
            : loading
            ? STATUS_LABELS[status]
            : `BUY · $${displayPrice} USDC`}
        </button>
      )}
    </div>
  )
}

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const { player } = usePlayerStore()

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
      setItems(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 16 }}>
      {/* Header */}
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#a78bfa', textAlign: 'center', marginBottom: 6 }}>
        🛒 ITEM SHOP
      </div>
      <div style={{ fontSize: 10, color: '#7c6fa0', textAlign: 'center', marginBottom: 16, fontFamily: '"IBM Plex Mono", monospace' }}>
        Pay with USDC on Base
      </div>

      {/* Shield free info */}
      <div style={{
        background: 'rgba(124,58,237,0.1)',
        border: '1px solid rgba(124,58,237,0.3)',
        borderRadius: 4,
        padding: 12,
        marginBottom: 14,
        fontSize: 10,
        color: '#7c6fa0',
        fontFamily: '"IBM Plex Mono", monospace',
        lineHeight: 1.6,
      }}>
        🛡️ <span style={{ color: '#a78bfa' }}>Shield</span> spawns in-game for free (2% chance).
        Other items also spawn randomly — buy for guaranteed stock.
      </div>

      {/* Inventory shortcut */}
      {player && (
        <div style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 4,
          padding: '10px 14px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 10, color: '#7c6fa0', fontFamily: '"IBM Plex Mono", monospace' }}>Your items</span>
          <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
            {Object.entries(player.items || {}).map(([key, count]) =>
              count > 0 ? (
                <span key={key} title={key}>
                  {ITEM_ICONS[key] || key} <span style={{ fontSize: 9, color: '#10b981' }}>x{count}</span>
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#7c6fa0', fontFamily: '"Press Start 2P", monospace', fontSize: 8, marginTop: 40 }}>
          LOADING...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(item => <ItemCard key={item.item_key} item={item} />)}
        </div>
      )}
    </div>
  )
}
