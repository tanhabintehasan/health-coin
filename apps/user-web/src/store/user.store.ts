import { create } from 'zustand'

interface UserState {
  user: any | null
  token: string | null
  setAuth: (user: any, token: string) => void
  logout: () => void
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('access_token')
  } catch {
    return null
  }
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: getStoredToken(),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token)
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, token: null })
  },
}))
