import client from './client'

export const api = {
  // Auth (merchants use same auth flow as users)
  sendOtp: (phone: string) => client.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, code: string) =>
    client.post<any, any>('/auth/otp/verify', { phone, code }),

  // Merchant profile
  getMyMerchant: () => client.get<any, any>('/merchants/me'),
  updateMyMerchant: (data: any) => client.put<any, any>('/merchants/me', data),
  applyMerchant: (data: any) => client.post<any, any>('/merchants', data),

  // Products — backend routes: POST /products/merchant, GET /products/merchant/mine,
  //             PUT /products/merchant/:id, DELETE /products/merchant/:id
  getMerchantProducts: (params?: any) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return client.get<any, any>(`/products/merchant/mine${q}`)
  },
  createProduct: (data: any) => client.post<any, any>('/products/merchant', data),
  updateProduct: (id: string, data: any) => client.put<any, any>(`/products/merchant/${id}`, data),
  deleteProduct: (id: string) => client.delete<any, any>(`/products/merchant/${id}`),
  getCategories: () => client.get<any, any>('/products/categories'),

  // Orders — backend routes: GET /orders/merchant/list, PATCH /orders/merchant/:id/status
  getMerchantOrders: (params?: any) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return client.get<any, any>(`/orders/merchant/list${q}`)
  },
  updateOrderStatus: (id: string, status: string) =>
    client.patch<any, any>(`/orders/merchant/${id}/status`, { status }),

  // Redemption — scan returns { orderItemId, productName, remainingCount, validUntil, ... }
  //              confirm expects { orderItemId, quantity }
  getRedemptionLogs: (params?: any) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : ''
    return client.get<any, any>(`/redemption/logs${q}`)
  },
  scanCode: (code: string) => client.post<any, any>('/redemption/scan', { code }),
  confirmRedemption: (orderItemId: string, quantity: number) =>
    client.post<any, any>('/redemption/confirm', { orderItemId, quantity }),
}
