import { create } from 'zustand'

interface UserState {
  user: any | null
  token: string | null
  refreshToken: string | null
  setAuth: (user: any, token: string, refreshToken: string) => void
  logout: () => void
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('access_token')
  } catch {
    return null
  }
}

const getStoredRefreshToken = (): string | null => {
  try {
    return localStorage.getItem('refresh_token')
  } catch {
    return null
  }
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: getStoredToken(),
  refreshToken: getStoredRefreshToken(),
  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    set({ user, token, refreshToken })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    set({ user: null, token: null, refreshToken: null })
  },
}))
