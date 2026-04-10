import { useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { api } from '../../services/api'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  PAID: 'Paid',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDING: 'Refunding',
  REFUNDED: 'Refunded',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#fa8c16',
  PAID: '#1677ff',
  PROCESSING: '#1677ff',
  SHIPPED: '#722ed1',
  COMPLETED: '#52c41a',
  CANCELLED: '#999',
  REFUNDING: '#ff4d4f',
  REFUNDED: '#999',
}

const WALLET_LABELS: Record<string, string> = {
  HEALTH_COIN: 'HealthCoin',
  MUTUAL_HEALTH_COIN: 'Mutual HealthCoin',
  UNIVERSAL_HEALTH_COIN: 'Universal HealthCoin',
}

const WALLET_COLORS: Record<string, string> = {
  HEALTH_COIN: '#1677ff',
  MUTUAL_HEALTH_COIN: '#52c41a',
  UNIVERSAL_HEALTH_COIN: '#722ed1',
}

export default function OrderPage() {
  const router = useRouter()
  const { items: itemsParam } = router.params

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [checkoutMode] = useState(!!itemsParam)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({})

  const checkoutItems = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : []
  const total = checkoutItems.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0)

  const fetchWalletBalances = async () => {
    try {
      const wallets: any = await api.getWallets()
      const balanceMap: Record<string, number> = {}
      for (const w of wallets ?? []) {
        balanceMap[w.walletType] = Number(w.balance)
      }
      setWalletBalances(balanceMap)
    } catch {}
  }

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const res: any = await api.listOrders({ page: 1, limit: 20 })
      setOrders(res.data ?? [])
    } catch {} finally { setLoading(false) }
  }

  useDidShow(() => {
    if (checkoutMode) {
      fetchWalletBalances()
    } else {
      fetchOrders()
    }
  })

  const placeOrder = async () => {
    if (!address.trim()) {
      Taro.showToast({ title: 'Enter delivery address', icon: 'error' })
      return
    }
    setPlacing(true)
    try {
      const noteText = [address, note].filter(Boolean).join(' | ')
      const order = await api.createOrder({
        items: checkoutItems.map((i: any) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        note: noteText,
      })
      for (const item of checkoutItems) {
        await api.removeFromCart(item.productId, item.variantId).catch(() => {})
      }
      Taro.redirectTo({ url: `/pages/order/detail?id=${order.id}` })
    } catch (err: any) {
      Taro.showToast({ title: err || 'Failed to place order', icon: 'error' })
    } finally { setPlacing(false) }
  }

  if (checkoutMode) {
    return (
      <View style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Step indicator */}
        <View style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          {[
            { num: '1', label: 'Review' },
            { num: '2', label: 'Address' },
            { num: '3', label: 'Pay' },
          ].map((step, idx) => (
            <View key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
              <View style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <View style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: idx === 0 ? '#1677ff' : '#e0e0e0',
                }}>
                  <Text style={{ fontSize: '12px', color: idx === 0 ? '#fff' : '#999', fontWeight: 'bold' }}>{step.num}</Text>
                </View>
                <Text style={{ fontSize: '12px', color: idx === 0 ? '#1677ff' : '#999', fontWeight: idx === 0 ? '500' : 'normal' }}>{step.label}</Text>
              </View>
              {idx < 2 && <Text style={{ color: '#d0d0d0', margin: '0 8px', fontSize: '14px' }}>→</Text>}
            </View>
          ))}
        </View>

        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <Text style={{ fontSize: '15px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Order Summary</Text>
          {checkoutItems.map((item: any) => (
            <View key={`${item.productId}:${item.variantId}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '13px', color: '#333' }}>{item.product?.name}</Text>
                <Text style={{ fontSize: '12px', color: '#999' }}> x{item.quantity}</Text>
              </View>
              <Text style={{ fontSize: '13px', color: '#1677ff' }}>¥{(Number(item.subtotal) / 100).toFixed(2)}</Text>
            </View>
          ))}
          <View style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '15px', fontWeight: 'bold' }}>Total</Text>
            <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>¥{(total / 100).toFixed(2)}</Text>
          </View>
        </View>

        {/* Coin Balances */}
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Your Coin Balances</Text>
          {(['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const).map((wt) => (
            <View key={wt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Text style={{ fontSize: '13px', color: '#555' }}>{WALLET_LABELS[wt]}</Text>
              <Text style={{ fontSize: '14px', fontWeight: '500', color: WALLET_COLORS[wt] }}>
                {((walletBalances[wt] ?? 0) / 100).toFixed(2)}
              </Text>
            </View>
          ))}
          <Text style={{ fontSize: '11px', color: '#999', marginTop: '4px', display: 'block' }}>
            You can choose payment method on the next screen after placing your order.
          </Text>
        </View>

        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <View style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>Delivery Address</Text>
            <Text style={{ color: '#ff4d4f', marginLeft: '2px', fontSize: '14px' }}> *</Text>
          </View>
          <View style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '48px' }}>
            <Text style={{ fontSize: '14px', color: address ? '#333' : '#bbb', flex: 1 }}>
              {address || 'No address entered'}
            </Text>
            <View
              onClick={() => {
                ;(Taro.showModal as any)({
                  title: 'Enter Address',
                  editable: true,
                  placeholderText: 'Street, City, Province',
                  success: (res: any) => { if (res.confirm && res.content) setAddress(res.content) },
                })
              }}
              style={{ marginLeft: '12px', padding: '4px 8px', background: '#f0f0f0', borderRadius: '6px' }}
            >
              <Text style={{ fontSize: '12px', color: '#555' }}>&#9998; Edit</Text>
            </View>
          </View>
        </View>

        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <Text style={{ fontSize: '14px', color: '#333', marginBottom: '8px', display: 'block' }}>Note (optional)</Text>
          <View
            style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', minHeight: '60px' }}
            onClick={() => {
              ;(Taro.showModal as any)({
                title: 'Add Note',
                editable: true,
                placeholderText: 'Special instructions...',
                success: (res: any) => { if (res.confirm) setNote(res.content || '') },
              })
            }}
          >
            <Text style={{ fontSize: '14px', color: note ? '#333' : '#bbb' }}>
              {note || 'Tap to add note'}
            </Text>
          </View>
        </View>

        <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)' }}>
          <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>¥{(total / 100).toFixed(2)}</Text>
          <Button onClick={placeOrder} loading={placing}
            style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '0 32px' }}>
            Place Order
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <ScrollView scrollY>
        {loading && (
          <View style={{ textAlign: 'center', padding: '40px' }}>
            <Text style={{ color: '#999' }}>Loading...</Text>
          </View>
        )}
        {!loading && !orders.length && (
          <View style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Text style={{ fontSize: '16px', color: '#999' }}>No orders yet</Text>
          </View>
        )}
        {orders.map((order: any) => (
          <View
            key={order.id}
            onClick={() => Taro.navigateTo({ url: `/pages/order/detail?id=${order.id}` })}
            style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}
          >
            <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '12px', color: '#999' }}>#{order.id.slice(-8).toUpperCase()}</Text>
              <Text style={{ fontSize: '12px', color: STATUS_COLOR[order.status] ?? '#999', fontWeight: '500' }}>
                {STATUS_LABEL[order.status] ?? order.status}
              </Text>
            </View>
            <View style={{ marginBottom: '8px' }}>
              {order.items?.slice(0, 2).map((item: any) => (
                <Text key={item.id} style={{ fontSize: '13px', color: '#333', display: 'block' }}>
                  {item.productName} x{item.quantity}
                </Text>
              ))}
              {order.items?.length > 2 && (
                <Text style={{ fontSize: '12px', color: '#999' }}>+{order.items.length - 2} more</Text>
              )}
            </View>
            <View style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: '12px', color: '#999' }}>{order.createdAt?.slice(0, 10)}</Text>
              <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                ¥{(Number(order.totalAmount) / 100).toFixed(2)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
