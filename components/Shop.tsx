'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

export default function Shop() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)

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

  const isDiscounted = (item: ShopItem) => {
    if (!item.discount_until || !item.discounted_price_usd) return false
    return new Date(item.discount_until) > new Date()
  }

  const itemIcons: Record<string, string> = {
    flash: '⚡',
    slow: '🐌',
    double: '✖️',
    magnet: '🧲',
    extralife: '❤️',
  }

  const itemColors: Record<string, string> = {
    flash: 'border-yellow-400/50',
    slow: 'border-cyan-400/50',
    double: 'border-green-400/50',
    magnet: 'border-orange-400/50',
    extralife: 'border-red-400/50',
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="pixel-font text-farcaster-light text-center mb-4" style={{ fontSize: 9 }}>
        ITEM SHOP
      </div>

      {/* Free spawn info */}
      <div className="card p-3 border-farcaster/30">
        <div className="text-xs text-text-muted leading-relaxed">
          🛡️ <span className="text-farcaster-light">Shield</span> spawns in-game (2% chance) — FREE<br />
          Other items also spawn randomly, or buy guaranteed stock below.
        </div>
      </div>

      {loading ? (
        <div className="text-center text-text-muted pixel-font mt-8" style={{ fontSize: 8 }}>
          LOADING...
        </div>
      ) : (
        items.map(item => {
          const discounted = isDiscounted(item)
          const price = discounted ? item.discounted_price_usd! : item.price_usd

          return (
            <div key={item.item_key} className={`card p-4 ${itemColors[item.item_key] || ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{itemIcons[item.item_key]}</span>
                  <div>
                    <div className="pixel-font text-text text-xs">{item.name}</div>
                    <div className="text-text-muted text-xs mt-1">{item.description}</div>
                    <div className="flex gap-3 mt-2 text-xs text-text-muted">
                      {item.duration_seconds && (
                        <span>⏱ {item.duration_seconds}s</span>
                      )}
                      {item.score_multiplier > 1 && (
                        <span className="text-green-400">x{item.score_multiplier} score</span>
                      )}
                      {item.spawn_rate > 0 && (
                        <span>spawn {(item.spawn_rate * 100).toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  {discounted && (
                    <div className="text-text-muted line-through text-xs">
                      ${item.price_usd}
                    </div>
                  )}
                  <div className={`pixel-font text-sm ${discounted ? 'text-green-400' : 'text-pixel'}`}>
                    ${price}
                  </div>
                  {discounted && (
                    <div className="text-green-400 text-xs mt-1">SALE!</div>
                  )}
                </div>
              </div>

              <button
                className="btn-primary w-full mt-3 text-xs"
                onClick={() => alert('Payment coming soon — smart contract integration pending')}
              >
                BUY (USDC)
              </button>
            </div>
          )
        })
      )}
    </div>
  )
}
