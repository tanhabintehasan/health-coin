import { create } from 'zustand'

interface AuthState {
  token: string | null
  user: any | null
  setAuth: (user: any, token: string) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  user: null,
  setAuth: (user, token) => {
    localStorage.setItem('admin_token', token)
    set({ user, token })
  },
  setToken: (token) => {
    localStorage.setItem('admin_token', token)
    set({ token })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null, user: null })
  },
}))
