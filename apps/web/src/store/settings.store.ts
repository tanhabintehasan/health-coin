import { create } from 'zustand'
import { api } from '../services/api'

interface PublicSettings {
  platform: {
    name: string
    hotline: string
    address: string
  }
  auth: {
    smsEnabled: boolean
    otpExpirySeconds: number
    otpResendSeconds: number
  }
  payments: {
    fuiou: boolean
    lcsw: boolean
    coin: boolean
  }
  business: {
    productReviewRequired: boolean
    redemptionCodeValidDays: number
    allowPartialRedemption: boolean
  }
  coinRates: {
    mutualCoinOwnRate: number
    mutualCoinL1Rate: number
    mutualCoinL2Rate: number
    healthCoinMultiplier: number
    universalCoinOwnRate: number
    universalCoinL1Rate: number
  }
  finance: {
    withdrawalCommissionRate: number
    platformCommissionRate: number
  }
}

interface SettingsState {
  settings: PublicSettings | null
  loading: boolean
  fetchSettings: () => Promise<void>
}

const defaultSettings: PublicSettings = {
  platform: { name: 'HealthCoin', hotline: '', address: '' },
  auth: { smsEnabled: true, otpExpirySeconds: 300, otpResendSeconds: 60 },
  payments: { fuiou: true, lcsw: false, coin: true },
  business: { productReviewRequired: false, redemptionCodeValidDays: 30, allowPartialRedemption: false },
  coinRates: { mutualCoinOwnRate: 0.5, mutualCoinL1Rate: 0.25, mutualCoinL2Rate: 0.1, healthCoinMultiplier: 2.0, universalCoinOwnRate: 0.2, universalCoinL1Rate: 0.1 },
  finance: { withdrawalCommissionRate: 0.05, platformCommissionRate: 0.05 },
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,
  fetchSettings: async () => {
    set({ loading: true })
    try {
      const data = await api.getPublicSettings()
      set({ settings: { ...defaultSettings, ...data } as PublicSettings })
    } catch {
      set({ settings: defaultSettings })
    } finally {
      set({ loading: false })
    }
  },
}))
