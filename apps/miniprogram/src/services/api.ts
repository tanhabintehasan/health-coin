import Taro from '@tarojs/taro'

// Set BASE_URL via env injection at build time, or update for your deployment
const BASE_URL = process.env.TARO_APP_API_URL || 'http://localhost:10000/api/v1'

function getToken(): string {
  return Taro.getStorageSync('access_token') || ''
}

function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    Taro.request({
      url: `${BASE_URL}${path}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      success: (res) => {
        if (res.statusCode === 401) {
          Taro.removeStorageSync('access_token')
          Taro.reLaunch({ url: '/pages/auth/index' })
          reject('Unauthorized')
        } else if (res.statusCode >= 400) {
          reject((res.data as any)?.message || 'Request failed')
        } else {
          resolve(res.data as any)
        }
      },
      fail: (err) => reject(err.errMsg || 'Network error'),
    })
  })
}

export const api = {
  // Auth
  sendOtp: (phone: string) => request('POST', '/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string, referralCode?: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/otp/verify', { phone, code, referralCode }),

  // Users
  getMe: () => request<any>('GET', '/users/me'),
  updateMe: (data: any) => request<any>('PUT', '/users/me', data),

  // Wallets
  getWallets: () => request<any[]>('GET', '/wallets'),
  getTransactions: (params: { walletType?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return request<any>('GET', `/wallets/transactions?${q}`)
  },

  // Referral
  getMyReferral: () => request<any>('GET', '/referral/my'),
  getMyReferrals: () => request<any[]>('GET', '/referral/my/referrals'),

  // Membership
  getTiers: () => request<any[]>('GET', '/membership/tiers'),
  getMyMembership: () => request<any>('GET', '/membership/my'),

  // Products
  listProducts: (params: any) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return request<any>('GET', `/products?${q}`)
  },
  getProduct: (id: string) => request<any>('GET', `/products/${id}`),
  getCategories: () => request<any[]>('GET', '/products/categories'),

  // Cart
  getCart: () => request<any>('GET', '/cart'),
  addToCart: (data: any) => request<any>('POST', '/cart', data),
  removeFromCart: (productId: string, variantId: string) =>
    request<any>('DELETE', `/cart/${productId}/${variantId}`),

  // Orders
  createOrder: (data: { items: any[]; note?: string }) =>
    request<any>('POST', '/orders', { items: data.items, remark: data.note }),
  listOrders: (params: { status?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)])
      )
    ).toString()
    return request<any>('GET', `/orders?${q}`)
  },
  getOrder: (id: string) => request<any>('GET', `/orders/${id}`),
  cancelOrder: (id: string) => request<any>('PATCH', `/orders/${id}/cancel`),

  // Payments — walletType matches backend WalletType enum:
  //   undefined → Fuiou cash payment
  //   'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN' → coin debit
  payOrder: (orderId: string, walletType?: 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN') =>
    request<any>('POST', `/payments/orders/${orderId}/pay`, walletType ? { walletType } : {}),

  // LCSW mini-program payment
  payLcswMini: (orderId: string, openId: string, subAppId?: string) =>
    request<any>('POST', `/payments/orders/${orderId}/pay/lcsw-mini`, { openId, subAppId }),

  // WeChat login
  wxLogin: (code: string) => request<any>('POST', '/auth/wx-login', { code }),

  // Redemption
  getMyCodes: () => request<any[]>('GET', '/redemption/my-codes'),

  // Merchants
  getMerchant: (id: string) => request<any>('GET', `/merchants/${id}`),

  // Withdrawals
  requestWithdrawal: (data: { payoutMethod: 'BANK' | 'ALIPAY' | 'WECHAT'; payoutAccount: any; amount: number }) =>
    request<any>('POST', '/withdrawals', data),

  // Health Records
  listHealthRecords: () => request<any[]>('GET', '/health-records'),
  saveHealthRecord: (data: { fileUrl: string; fileType: string; fileName: string }) =>
    request<any>('POST', '/health-records', data),
  deleteHealthRecord: (id: string) => request<any>('DELETE', `/health-records/${id}`),
}
