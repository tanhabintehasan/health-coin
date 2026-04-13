import { create } from 'zustand'

interface WishlistState {
  items: string[] // product ids
  add: (id: string) => void
  remove: (id: string) => void
  has: (id: string) => boolean
  toggle: (id: string) => void
}

const STORAGE_KEY = 'healthcoin_wishlist'

function readStored(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: readStored(),
  add: (id) => {
    const next = [...new Set([...get().items, id])]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ items: next })
  },
  remove: (id) => {
    const next = get().items.filter((x) => x !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    set({ items: next })
  },
  has: (id) => get().items.includes(id),
  toggle: (id) => {
    if (get().has(id)) get().remove(id)
    else get().add(id)
  },
}))
