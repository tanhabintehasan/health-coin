/// <reference types="vite/client" />
import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthcoin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('healthcoin_token')
      const pathname = window.location.pathname
      if (!pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    const msg = err.response?.data?.message || err.message || 'Request failed'
    return Promise.reject(msg)
  }
)

function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any, params?: any, config?: any): Promise<T> {
  return client.request({ method, url: path, data, params, ...config }).then((res) => res.data?.data ?? res.data)
}

// ─── Unified API ─────────────────────────────────────────────────────────────

export const api = {
  // Auth
  sendOtp: (phone: string) => request('POST', '/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string, referralCode?: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/otp/verify', { phone, code, referralCode }),

  // Users / Me
  getMe: () => request<any>('GET', '/users/me'),
  updateMe: (data: any) => request<any>('PUT', '/users/me', data),

  // Role probes
  getMyMerchant: () => request<any>('GET', '/merchants/me'),
  // Wallets
  getWallets: () => request<any[]>('GET', '/wallets'),
  getTransactions: (params?: { walletType?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/wallets/transactions', undefined, params),

  // Referral
  getMyReferral: () => request<any>('GET', '/referral/my'),
  getMyReferrals: () => request<any[]>('GET', '/referral/my/referrals'),

  // Membership
  getTiers: () => request<any[]>('GET', '/membership/tiers'),
  getMyMembership: () => request<any>('GET', '/membership/my'),

  // Products (public / user)
  listProducts: (params?: any) => request<any>('GET', '/products', undefined, params),
  getProduct: (id: string) => request<any>('GET', `/products/${id}`),
  getCategories: () => request<any[]>('GET', '/products/categories'),

  // Cart
  getCart: () => request<any>('GET', '/cart'),
  addToCart: (data: any) => request<any>('POST', '/cart', data),
  removeFromCart: (productId: string, variantId: string) =>
    request<any>('DELETE', `/cart/${productId}/${variantId}`),

  // Orders (user)
  createOrder: (data: { items: any[]; note?: string }) =>
    request<any>('POST', '/orders', { items: data.items, remark: data.note }),
  listOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/orders', undefined, params),
  getOrder: (id: string) => request<any>('GET', `/orders/${id}`),
  cancelOrder: (id: string) => request<any>('PATCH', `/orders/${id}/cancel`),

  // Payments
  payOrder: (orderId: string, walletType?: 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN') =>
    request<any>('POST', `/payments/orders/${orderId}/pay`, walletType ? { walletType } : {}),

  // Redemption (user)
  getMyCodes: () => request<any[]>('GET', '/redemption/my-codes'),

  // Withdrawals (user)
  requestWithdrawal: (data: { payoutMethod: 'BANK' | 'ALIPAY' | 'WECHAT'; payoutAccount: any; amount: number }) =>
    request<any>('POST', '/withdrawals', data),

  // Health Records
  listHealthRecords: () => request<any[]>('GET', '/health-records'),
  saveHealthRecord: (data: { fileUrl: string; fileType: string; fileName: string }) =>
    request<any>('POST', '/health-records', data),
  deleteHealthRecord: (id: string) => request<any>('DELETE', `/health-records/${id}`),

  // ─── Merchant ───────────────────────────────────────────────────────────────
  applyMerchant: (data: any) => request<any>('POST', '/merchants', data),
  updateMyMerchant: (data: any) => request<any>('PUT', '/merchants/me', data),
  getMerchantProducts: (params?: any) => request<any>('GET', '/products/merchant/mine', undefined, params),
  createProduct: (data: any) => request<any>('POST', '/products/merchant', data),
  updateProduct: (id: string, data: any) => request<any>('PUT', `/products/merchant/${id}`, data),
  deleteProduct: (id: string) => request<any>('DELETE', `/products/merchant/${id}`),
  getMerchantOrders: (params?: any) => request<any>('GET', '/orders/merchant/list', undefined, params),
  updateOrderStatus: (id: string, status: string) => request<any>('PATCH', `/orders/merchant/${id}/status`, { status }),
  getRedemptionLogs: (params?: any) => request<any>('GET', '/redemption/logs', undefined, params),
  scanCode: (code: string) => request<any>('POST', '/redemption/scan', { code }),
  confirmRedemption: (orderItemId: string, quantity: number) =>
    request<any>('POST', '/redemption/confirm', { orderItemId, quantity }),

  // ─── Admin ──────────────────────────────────────────────────────────────────
  getAdminConfigs: () => request<any>('GET', '/admin/configs'),
  getAdminUsers: (params?: any) => request<any>('GET', '/admin/users', undefined, params),
  suspendUser: (id: string, isActive: boolean) => request<any>('PATCH', `/admin/users/${id}/suspend`, { isActive }),
  setUserLevel: (id: string, level: number) => request<any>('PATCH', `/admin/users/${id}/level`, { level }),
  adjustWallet: (id: string, data: any) => request<any>('PATCH', `/admin/users/${id}/wallet`, data),
  getReferralTree: (id: string) => request<any>('GET', `/admin/users/${id}/referral-tree`),

  getAdminMerchants: (params?: any) => request<any>('GET', '/admin/merchants', undefined, params),
  approveMerchant: (id: string) => request<any>('PATCH', `/admin/merchants/${id}/approve`),
  rejectMerchant: (id: string, note?: string) => request<any>('PATCH', `/admin/merchants/${id}/reject`, { rejectionNote: note }),
  suspendMerchant: (id: string, suspend: boolean) => request<any>('PATCH', `/admin/merchants/${id}/suspend`, { suspend }),

  getPendingProducts: (params?: any) => request<any>('GET', '/admin/products/pending', undefined, params),
  approveProduct: (id: string) => request<any>('PATCH', `/admin/products/${id}/approve`),
  rejectProduct: (id: string) => request<any>('PATCH', `/admin/products/${id}/reject`),

  getAdminOrders: (params?: any) => request<any>('GET', '/admin/orders', undefined, params),
  forceOrderStatus: (id: string, status: string) => request<any>('PATCH', `/admin/orders/${id}/status`, { status }),

  getAdminWithdrawals: (params?: any) => request<any>('GET', '/withdrawals/admin/pending', undefined, params),
  reviewWithdrawal: (id: string, data: any) => request<any>('PATCH', `/withdrawals/admin/${id}/review`, data),
  completeWithdrawal: (id: string) => request<any>('PATCH', `/withdrawals/admin/${id}/complete`),
  getFinanceSummary: () => request<any>('GET', '/withdrawals/admin/finance-summary'),

  updateAdminConfigs: (data: Record<string, string>) => request<any>('PUT', '/admin/configs', data),

  getAdminTiers: () => request<any>('GET', '/admin/membership/tiers'),
  updateAdminTier: (level: number, data: any) => request<any>('PATCH', `/admin/membership/tiers/${level}`, data),

  getAdminRedemptionLogs: (params?: any) => request<any>('GET', '/admin/redemption/logs', undefined, params),
  exportRedemptionLogs: () =>
    client.get('/admin/redemption/logs/export', { responseType: 'blob' }).then((res) => res.data),
}
