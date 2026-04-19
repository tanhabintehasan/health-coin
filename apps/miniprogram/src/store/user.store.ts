import { create } from 'zustand'
import Taro from '@tarojs/taro'

interface UserState {
  user: any | null
  token: string | null
  initialized: boolean
  setAuth: (user: any, token: string) => void
  setInitialized: (v: boolean) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: Taro.getStorageSync('access_token') || null,
  initialized: false,
  setAuth: (user, token) => {
    Taro.setStorageSync('access_token', token)
    set({ user, token })
  },
  setInitialized: (v) => set({ initialized: v }),
  logout: () => {
    Taro.removeStorageSync('access_token')
    Taro.removeStorageSync('openId')
    set({ user: null, token: null })
  },
}))
