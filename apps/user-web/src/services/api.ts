import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/auth'
    }
    const msg = err.response?.data?.message || err.message || 'Request failed'
    return Promise.reject(msg)
  }
)

function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any, params?: any): Promise<T> {
  return client.request({ method, url: path, data, params }).then((res) => res.data?.data ?? res.data)
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
  getTransactions: (params: { walletType?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/wallets/transactions', undefined, params),

  // Referral
  getMyReferral: () => request<any>('GET', '/referral/my'),
  getMyReferrals: () => request<any[]>('GET', '/referral/my/referrals'),

  // Membership
  getTiers: () => request<any[]>('GET', '/membership/tiers'),
  getMyMembership: () => request<any>('GET', '/membership/my'),

  // Products
  listProducts: (params: any) => request<any>('GET', '/products', undefined, params),
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
  listOrders: (params: { status?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/orders', undefined, params),
  getOrder: (id: string) => request<any>('GET', `/orders/${id}`),
  cancelOrder: (id: string) => request<any>('PATCH', `/orders/${id}/cancel`),

  // Payments
  payOrder: (orderId: string, walletType?: 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN') =>
    request<any>('POST', `/payments/orders/${orderId}/pay`, walletType ? { walletType } : {}),

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
