/// <reference types="vite/client" />
import axios, { AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL

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

const PUBLIC_PATHS = ['/', '/shop', '/about', '/contact', '/merchant-join', '/login', '/register', '/product']
function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

client.interceptors.response.use(
  (res) => res,
  (err: AxiosError<any>) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('healthcoin_token')
      try {
        window.dispatchEvent(new Event('healthcoin:logout'))
      } catch {}
      const pathname = window.location.pathname
      if (!isPublicPath(pathname) && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    const rawMsg = err.response?.data?.message
    const msg = Array.isArray(rawMsg)
      ? rawMsg.join('; ')
      : (rawMsg || err.message || '请求失败，请稍后重试')
    return Promise.reject(msg)
  }
)

function request<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any, params?: any, config?: any): Promise<T> {
  return client.request({ method, url: path, data, params, ...config }).then((res) => res.data)
}

// ─── Unified API ─────────────────────────────────────────────────────────────

export const api = {
  // Settings (public)
  getPublicSettings: () => request<any>('GET', '/settings/public'),
  previewCommission: (orderAmount: number) => request<any>('POST', '/coin-rewards/preview', { orderAmount }),

  // Auth
  sendOtp: (phone: string) => request('POST', '/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string, referralCode?: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/otp/verify', { phone, code, referralCode }),

  loginWithPassword: (phone: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('POST', '/auth/login', { phone, password }),

  setPassword: (password: string) =>
    request<{ success: boolean; message: string }>('POST', '/auth/password/set', { password }),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('POST', '/auth/password/change', { oldPassword, newPassword }),

  submitContact: (data: { name: string; email: string; phone?: string; message: string }) =>
    request<any>('POST', '/settings/contact', data),

  // Users / Me
  getMe: () => request<any>('GET', '/users/me'),
  updateMe: (data: any) => request<any>('PUT', '/users/me', data),

  // Upload
  uploadFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data as { url: string })
  },

  // WeChat
  wxLogin: (code: string) => request<any>('POST', '/auth/wx-login', { code }),
  wechatCallback: (code: string) => request<any>('GET', `/auth/wechat/callback?code=${code}`),

  // Role probes
  getMyMerchant: () => request<any>('GET', '/merchants/me'),

  // Wallets
  getWallets: () => request<any[]>('GET', '/wallets'),
  getTransactions: (params?: { walletType?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/wallets/transactions', undefined, params),

  // Referral
  getMyReferral: () => request<any>('GET', '/referral/my'),
  getMyReferrals: () => request<any[]>('GET', '/referral/my/referrals'),
  getMyReferralEarnings: () => request<any>('GET', '/referral/my/earnings'),

  // Membership
  getTiers: () => request<any[]>('GET', '/membership/tiers'),
  getMyMembership: () => request<any>('GET', '/membership/my'),

  // Regions
  getRegionsTree: () => request<any[]>('GET', '/regions/tree'),
  getProvinces: () => request<any[]>('GET', '/regions/provinces'),
  getCities: (provinceId: string) => request<any[]>('GET', `/regions/provinces/${provinceId}/cities`),
  getCounties: (cityId: string) => request<any[]>('GET', `/regions/cities/${cityId}/counties`),

  // Products (public / user)
  listProducts: (params?: any) => request<any>('GET', '/products', undefined, params),
  getProduct: (id: string) => request<any>('GET', `/products/${id}`),
  getCategories: () => request<any[]>('GET', '/products/categories'),

  // Merchants (public)
  listMerchantsPublic: (params?: any) => request<any>('GET', '/merchants/list/public', undefined, params),
  getMerchantStorefront: (id: string) => request<any>('GET', `/merchants/${id}`),

  // Cart
  getCart: () => request<any>('GET', '/cart'),
  addToCart: (data: any) => request<any>('POST', '/cart', data),
  removeFromCart: (productId: string, variantId: string) =>
    request<any>('DELETE', `/cart/${productId}/${variantId}`),

  // Orders (user)
  createOrder: (data: { items: any[]; note?: string; addressId?: string }) =>
    request<any>('POST', '/orders', { items: data.items, remark: data.note, addressId: data.addressId }),
  listOrders: (params?: { status?: string; page?: number; limit?: number }) =>
    request<any>('GET', '/orders', undefined, params),
  getOrder: (id: string) => request<any>('GET', `/orders/${id}`),
  cancelOrder: (id: string) => request<any>('PATCH', `/orders/${id}/cancel`),
  requestRefund: (id: string) => request<any>('PATCH', `/orders/${id}/refund`),

  // User addresses
  getMyAddresses: () => request<any[]>('GET', '/users/addresses'),
  createAddress: (data: any) => request<any>('POST', '/users/addresses', data),

  // Payments
  payOrder: (orderId: string, walletType?: 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN', method?: 'FUIOU' | 'LCSW' | 'WECHAT' | 'ALIPAY') =>
    request<any>('POST', `/payments/orders/${orderId}/pay`, { ...(walletType ? { walletType } : {}), ...(method ? { method } : {}) }),

  // Redemption (user)
  getMyCodes: () => request<any[]>('GET', '/redemption/my-codes'),

  // Withdrawals (user)
  requestWithdrawal: (data: { payoutMethod: 'BANK' | 'ALIPAY' | 'WECHAT'; payoutAccount: any; amount: number }) =>
    request<any>('POST', '/withdrawals', data),
  getMyWithdrawals: (params?: any) => request<any>('GET', '/withdrawals', undefined, params),

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
  activateProduct: (id: string) => request<any>('PATCH', `/products/merchant/${id}/activate`),
  deactivateProduct: (id: string) => request<any>('PATCH', `/products/merchant/${id}/deactivate`),
  getMerchantOrders: (params?: any) => request<any>('GET', '/orders/merchant/list', undefined, params),
  updateOrderStatus: (id: string, status: string) => request<any>('PATCH', `/orders/merchant/${id}/status`, { status }),
  shipOrder: (id: string, trackingNumber: string) => request<any>('PATCH', `/orders/merchant/${id}/ship`, { trackingNumber }),
  getRedemptionLogs: (params?: any) => request<any>('GET', '/redemption/logs', undefined, params),
  scanCode: (code: string) => request<any>('POST', '/redemption/scan', { code }),
  confirmRedemption: (orderItemId: string, quantity: number) =>
    request<any>('POST', '/redemption/confirm', { orderItemId, quantity }),

  // ─── Admin ──────────────────────────────────────────────────────────────────
  getAdminConfigs: () => request<any>('GET', '/admin/configs'),
  updateAdminConfigs: (data: Record<string, string>) => request<any>('PUT', '/admin/configs', data),

  getAdminUsers: (params?: any) => request<any>('GET', '/admin/users', undefined, params),
  createUser: (data: any) => request<any>('POST', '/admin/users', data),
  updateUser: (id: string, data: any) => request<any>('PATCH', `/admin/users/${id}`, data),
  suspendUser: (id: string, isActive: boolean) => request<any>('PATCH', `/admin/users/${id}/suspend`, { isActive }),
  setUserLevel: (id: string, level: number) => request<any>('PATCH', `/admin/users/${id}/level`, { level }),
  adjustWallet: (id: string, data: any) => request<any>('PATCH', `/admin/users/${id}/wallet`, data),
  getReferralTree: (id: string) => request<any>('GET', `/admin/users/${id}/referral-tree`),

  getAdminMerchants: (params?: any) => request<any>('GET', '/admin/merchants', undefined, params),
  approveMerchant: (id: string) => request<any>('PATCH', `/admin/merchants/${id}/approve`),
  rejectMerchant: (id: string, note?: string) => request<any>('PATCH', `/admin/merchants/${id}/reject`, { rejectionNote: note }),
  suspendMerchant: (id: string, suspend: boolean) => request<any>('PATCH', `/admin/merchants/${id}/suspend`, { suspend }),
  createMerchant: (data: any) => request<any>('POST', '/admin/merchants', data),

  getPendingProducts: (params?: any) => request<any>('GET', '/admin/products/pending', undefined, params),
  approveProduct: (id: string) => request<any>('PATCH', `/admin/products/${id}/approve`),
  rejectProduct: (id: string) => request<any>('PATCH', `/admin/products/${id}/reject`),
  getProductAuditLogs: (id: string) => request<any[]>('GET', `/admin/products/${id}/audit-logs`),

  getAdminOrders: (params?: any) => request<any>('GET', '/admin/orders', undefined, params),
  forceOrderStatus: (id: string, status: string) => request<any>('PATCH', `/admin/orders/${id}/status`, { status }),

  getAdminWithdrawals: (params?: any) => request<any>('GET', '/withdrawals/admin/pending', undefined, params),
  reviewWithdrawal: (id: string, data: any) => request<any>('PATCH', `/withdrawals/admin/${id}/review`, data),
  completeWithdrawal: (id: string) => request<any>('PATCH', `/withdrawals/admin/${id}/complete`),
  getFinanceSummary: () => request<any>('GET', '/withdrawals/admin/finance-summary'),

  getAdminTiers: () => request<any>('GET', '/admin/membership/tiers'),
  createAdminTier: (data: any) => request<any>('POST', '/admin/membership/tiers', data),
  updateAdminTier: (level: number, data: any) => request<any>('PATCH', `/admin/membership/tiers/${level}`, data),
  deleteAdminTier: (level: number) => request<any>('DELETE', `/admin/membership/tiers/${level}`),
  seedAdminTiers: () => request<any>('POST', '/admin/membership/tiers/seed'),

  getAdminRedemptionLogs: (params?: any) => request<any>('GET', '/admin/redemption/logs', undefined, params),
  exportRedemptionLogs: () =>
    client.get('/admin/redemption/logs/export', { responseType: 'blob' }).then((res) => res.data),

  // Categories (admin scaffold - backend may need matching endpoints)
  createCategory: (data: any) => request<any>('POST', '/admin/categories', data),
  updateCategory: (id: string, data: any) => request<any>('PUT', `/admin/categories/${id}`, data),
  deleteCategory: (id: string) => request<any>('DELETE', `/admin/categories/${id}`),

  // Commission
  getCommissionConfig: () => request<any>('GET', '/admin/commission/config'),
  updateCommissionConfig: (data: Record<string, string>) => request<any>('PUT', '/admin/commission/config', data),
}
