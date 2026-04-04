import { create } from 'zustand'
import { supabase, Player } from '@/lib/supabase'

interface PlayerStore {
  player: Player | null
  isLoading: boolean
  setPlayer: (player: Player) => void
  fetchOrCreatePlayer: (params: {
    wallet: string
    fid?: number
    username?: string
    avatarUrl?: string
  }) => Promise<Player>
  updateItems: (items: Record<string, number>) => void
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  player: null,
  isLoading: false,

  setPlayer: (player) => set({ player }),

  fetchOrCreatePlayer: async ({ wallet, fid, username, avatarUrl }) => {
    set({ isLoading: true })

    // Try fetch existing
    const { data: existing } = await supabase
      .from('players')
      .select('*')
      .eq('wallet_address', wallet.toLowerCase())
      .single()

    if (existing) {
      // Update active days if new day
      const lastActive = existing.last_active_date
      const today = new Date().toISOString().split('T')[0]

      if (lastActive !== today) {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]

        const newStreak = lastActive === yesterdayStr
          ? existing.streak_days + 1
          : 1

        const { data: updated } = await supabase
          .from('players')
          .update({
            active_days: existing.active_days + 1,
            last_active_date: today,
            streak_days: newStreak,
          })
          .eq('id', existing.id)
          .select()
          .single()

        const player = updated || existing
        set({ player, isLoading: false })
        return player
      }

      set({ player: existing, isLoading: false })
      return existing
    }

    // Create new player
    const { data: created, error } = await supabase
      .from('players')
      .insert({
        wallet_address: wallet.toLowerCase(),
        fid: fid || null,
        username: username || `player_${wallet.slice(2, 8)}`,
        avatar_url: avatarUrl || null,
        player_type: fid ? 'human' : 'agent',
        active_days: 1,
        last_active_date: new Date().toISOString().split('T')[0],
        streak_days: 1,
      })
      .select()
      .single()

    if (error) throw error

    set({ player: created, isLoading: false })
    return created
  },

  updateItems: (items) => {
    const player = get().player
    if (!player) return
    set({ player: { ...player, items } })
  },
}))
