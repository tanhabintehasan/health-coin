import { create } from 'zustand'
import { api } from '../services/api'

export type UserRole = 'admin' | 'merchant' | 'user' | null

interface AuthState {
  token: string | null
  user: any | null
  role: UserRole
  roleLoading: boolean
  initialized: boolean
  setAuth: (user: any, token: string, role?: UserRole) => void
  setUser: (user: any) => void
  logout: () => void
  detectRole: () => Promise<UserRole>
  init: () => Promise<void>
}

const TOKEN_KEY = 'healthcoin_token'
const USER_KEY = 'healthcoin_user'

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  role: null,
  roleLoading: false,
  initialized: false,

  setAuth: (user, token, role) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user, token, role: role ?? get().role })
  },

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, role: null, initialized: true, roleLoading: false })
  },

  detectRole: async () => {
    const token = get().token
    if (!token) {
      set({ role: null, roleLoading: false })
      return null
    }

    set({ roleLoading: true })
    try {
      // 1. Try admin first (fast endpoint)
      try {
        await api.getAdminConfigs()
        set({ role: 'admin', roleLoading: false, initialized: true })
        return 'admin'
      } catch {}

      // 2. Try merchant
      try {
        const m = await api.getMyMerchant()
        if (m && m.id) {
          set({ role: 'merchant', roleLoading: false, initialized: true })
          return 'merchant'
        }
      } catch {}

      // 3. Default to user
      set({ role: 'user', roleLoading: false, initialized: true })
      return 'user'
    } catch {
      set({ role: 'user', roleLoading: false, initialized: true })
      return 'user'
    }
  },

  init: async () => {
    const token = get().token
    if (!token) {
      set({ initialized: true })
      return
    }

    // First, try to get current user info
    try {
      const me = await api.getMe()
      set({ user: me })
      localStorage.setItem(USER_KEY, JSON.stringify(me))
    } catch {
      // token invalid
      get().logout()
      return
    }
    await get().detectRole()
  },
}))
