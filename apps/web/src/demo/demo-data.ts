/**
 * TEMPORARY DEMO DATA
 * Used only for client review when demo mode is active.
 * Bypasses backend dependency so dashboards and storefront render fully.
 * Controlled by VITE_DEMO_LOGIN_ENABLED and the demo auth token.
 * Safe to remove after client review is complete.
 */

export const isDemoMode = () => {
  try {
    return localStorage.getItem('healthcoin_token') === 'demo_token'
  } catch {
    return false
  }
}

export const DEMO_CATEGORIES = [
  { id: 'cat-health', name: '健康护理', sortOrder: 1, children: [] },
  { id: 'cat-food', name: '有机食品', sortOrder: 2, children: [] },
  { id: 'cat-service', name: '健康服务', sortOrder: 3, children: [] },
]

export const DEMO_MERCHANTS = [
  { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
  { id: 'demo-merch-2', name: '绿源有机食品', logoUrl: '' },
]

export const DEMO_PRODUCTS = [
  {
    id: 'demo-prod-1',
    name: '医用防护口罩（50只装）',
    description: '医用防护口罩 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=医用防护口罩'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '2990',
    coinOffsetRate: '0.2',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-health', name: '健康护理' },
    variants: [{ id: 'demo-var-1', name: '默认规格', price: '2990', stock: 200 }],
  },
  {
    id: 'demo-prod-2',
    name: '维生素C泡腾片',
    description: '维生素C泡腾片 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=维生素C泡腾片'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '5990',
    coinOffsetRate: '0.3',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-health', name: '健康护理' },
    variants: [{ id: 'demo-var-2', name: '默认规格', price: '5990', stock: 150 }],
  },
  {
    id: 'demo-prod-3',
    name: '家用电子血压计',
    description: '家用电子血压计 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=家用电子血压计'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '19900',
    coinOffsetRate: '0.1',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-health', name: '健康护理' },
    variants: [{ id: 'demo-var-3', name: '默认规格', price: '19900', stock: 80 }],
  },
  {
    id: 'demo-prod-4',
    name: '有机燕麦片 1kg',
    description: '有机燕麦片 1kg - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=有机燕麦片'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '4500',
    coinOffsetRate: '0.25',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-2', name: '绿源有机食品', logoUrl: '' },
    category: { id: 'cat-food', name: '有机食品' },
    variants: [{ id: 'demo-var-4', name: '默认规格', price: '4500', stock: 300 }],
  },
  {
    id: 'demo-prod-5',
    name: '特级初榨橄榄油 500ml',
    description: '特级初榨橄榄油 500ml - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=特级初榨橄榄油'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '8900',
    coinOffsetRate: '0.15',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-2', name: '绿源有机食品', logoUrl: '' },
    category: { id: 'cat-food', name: '有机食品' },
    variants: [{ id: 'demo-var-5', name: '默认规格', price: '8900', stock: 120 }],
  },
  {
    id: 'demo-prod-6',
    name: '中医体质调理套餐',
    description: '中医体质调理套餐 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=中医体质调理套餐'],
    productType: 'SERVICE',
    deliveryType: 'IN_STORE_REDEMPTION',
    basePrice: '29900',
    coinOffsetRate: '0.5',
    status: 'ACTIVE',
    requiresApproval: false,
    validityDays: 90,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-service', name: '健康服务' },
    variants: [{ id: 'demo-var-6', name: '默认规格', price: '29900', stock: 50 }],
  },
  {
    id: 'demo-prod-7',
    name: '健康体检基础套餐',
    description: '健康体检基础套餐 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=健康体检基础套餐'],
    productType: 'SERVICE',
    deliveryType: 'IN_STORE_REDEMPTION',
    basePrice: '59900',
    coinOffsetRate: '0.4',
    status: 'ACTIVE',
    requiresApproval: false,
    validityDays: 180,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-service', name: '健康服务' },
    variants: [{ id: 'demo-var-7', name: '默认规格', price: '59900', stock: 30 }],
  },
  {
    id: 'demo-prod-8',
    name: '益生菌冻干粉',
    description: '益生菌冻干粉 - 精选优质商品，平台正品保障',
    images: ['https://placehold.co/400x300?text=益生菌冻干粉'],
    productType: 'PHYSICAL',
    deliveryType: 'DELIVERY',
    basePrice: '12800',
    coinOffsetRate: '0.2',
    status: 'ACTIVE',
    requiresApproval: false,
    merchant: { id: 'demo-merch-1', name: '康健大药房', logoUrl: '' },
    category: { id: 'cat-health', name: '健康护理' },
    variants: [{ id: 'demo-var-8', name: '默认规格', price: '12800', stock: 180 }],
  },
]

export const DEMO_ADMIN_SUMMARY = {
  totalUsers: 1248,
  totalMerchants: 36,
  totalCompletedOrders: 5820,
  totalRevenue: '12850000',
  pendingWithdrawals: 12,
  totalPaidOut: '4560000',
  totalMutualCoinsIssued: '320000',
  totalUniversalCoinsIssued: '85000',
}

export const DEMO_RECENT_ORDERS = [
  { id: 'demo-order-1', orderNo: 'DEMO001', status: 'PAID', totalAmount: '5990', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'demo-order-2', orderNo: 'DEMO002', status: 'SHIPPED', totalAmount: '19900', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'demo-order-3', orderNo: 'DEMO003', status: 'COMPLETED', totalAmount: '29900', createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 'demo-order-4', orderNo: 'DEMO004', status: 'PROCESSING', totalAmount: '4500', createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: 'demo-order-5', orderNo: 'DEMO005', status: 'PENDING_PAYMENT', totalAmount: '8900', createdAt: new Date(Date.now() - 432000000).toISOString() },
]

export const DEMO_MERCHANT = {
  id: 'demo-merch-1',
  name: '康健大药房',
  description: '专注家庭健康护理，正品保障，极速发货',
  status: 'APPROVED',
  commissionRate: 0.05,
  approvedAt: new Date().toISOString(),
}
