import { create } from 'zustand'
import Taro from '@tarojs/taro'

interface UserState {
  user: any | null
  token: string | null
  setAuth: (user: any, token: string) => void
  logout: () => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  token: Taro.getStorageSync('access_token') || null,
  setAuth: (user, token) => {
    Taro.setStorageSync('access_token', token)
    set({ user, token })
  },
  logout: () => {
    Taro.removeStorageSync('access_token')
    set({ user: null, token: null })
  },
}))
