import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  user: any | null
  merchant: any | null
  setAuth: (user: any, token: string) => void
  setMerchant: (merchant: any) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      merchant: null,
      setAuth: (user, token) => {
        localStorage.setItem('merchant_token', token)
        set({ user, token })
      },
      setMerchant: (merchant) => set({ merchant }),
      clearAuth: () => {
        localStorage.removeItem('merchant_token')
        set({ user: null, token: null, merchant: null })
      },
    }),
    { name: 'merchant-auth' }
  )
)
