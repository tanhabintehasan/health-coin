import { useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
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

type CoinType = 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN'

const PAY_OPTIONS: Array<{ value: 'FUIOU' | CoinType; label: string; sub: string; color: string }> = [
  { value: 'FUIOU', label: 'WeChat Pay', sub: 'Pay with WeChat / Alipay', color: '#07c160' },
  { value: 'HEALTH_COIN', label: 'HealthCoin', sub: 'HC', color: '#1677ff' },
  { value: 'MUTUAL_HEALTH_COIN', label: 'Mutual HealthCoin', sub: 'MHC', color: '#52c41a' },
  { value: 'UNIVERSAL_HEALTH_COIN', label: 'Universal HealthCoin', sub: 'UHC', color: '#722ed1' },
]

export default function OrderDetailPage() {
  const router = useRouter()
  const { id } = router.params
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'FUIOU' | CoinType>('FUIOU')
  const [wallets, setWallets] = useState<Record<string, number>>({})

  const fetchOrder = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [res, walletsRes]: any[] = await Promise.all([
        api.getOrder(id),
        api.getWallets(),
      ])
      setOrder(res)
      const balMap: Record<string, number> = {}
      for (const w of walletsRes ?? []) balMap[w.walletType] = Number(w.balance)
      setWallets(balMap)
    } catch {
      Taro.navigateBack()
    } finally { setLoading(false) }
  }

  useDidShow(() => { fetchOrder() })

  const pay = async () => {
    setPaying(true)
    try {
      const walletType = payMethod === 'FUIOU' ? undefined : payMethod
      const res = await api.payOrder(id!, walletType)
      if (res.payUrl) {
        Taro.showModal({ title: 'Payment', content: 'Redirecting to payment...', showCancel: false })
      } else {
        Taro.showToast({ title: 'Payment successful', icon: 'success' })
        fetchOrder()
      }
    } catch (err: any) {
      Taro.showToast({ title: err || 'Payment failed', icon: 'error' })
    } finally { setPaying(false) }
  }

  const cancelOrder = async () => {
    Taro.showModal({
      title: 'Cancel Order',
      content: 'Are you sure you want to cancel this order?',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await api.cancelOrder(id!)
          Taro.showToast({ title: 'Order cancelled', icon: 'success' })
          fetchOrder()
        } catch (err: any) {
          Taro.showToast({ title: err || 'Failed to cancel', icon: 'error' })
        }
      },
    })
  }

  if (loading) return <View style={{ padding: 40, textAlign: 'center' }}><Text>Loading...</Text></View>
  if (!order) return null

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      <ScrollView scrollY>
        {/* Status header */}
        <View style={{ background: STATUS_COLOR[order.status] ?? '#1677ff', padding: '20px 16px' }}>
          <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Text>
          <View><Text style={{ fontSize: '13px', color: 'rgba(255,255,255,.8)' }}>Order #{order.orderNo ?? order.id?.slice(-8).toUpperCase()}</Text></View>
        </View>

        {/* Items */}
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>Items</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '13px', color: '#333', display: 'block' }}>{item.productName}</Text>
                <Text style={{ fontSize: '12px', color: '#999' }}>{item.variantName} x{item.quantity}</Text>
                {item.redemptionCode && (
                  <View style={{ marginTop: '6px', background: '#f6f8ff', borderRadius: '6px', padding: '6px 10px', display: 'inline-flex', flexDirection: 'column' }}>
                    <Text style={{ fontSize: '11px', color: '#999' }}>Redemption Code</Text>
                    <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff', letterSpacing: '2px' }}>
                      {item.redemptionCode}
                    </Text>
                    {item.validUntil && (
                      <Text style={{ fontSize: '11px', color: '#fa8c16' }}>
                        Valid until {new Date(item.validUntil).toLocaleDateString('zh-CN')}
                      </Text>
                    )}
                    <Text style={{ fontSize: '11px', color: '#52c41a' }}>
                      {item.redeemedCount}/{item.redeemableCount} redeemed
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: '13px', color: '#1677ff' }}>¥{(Number(item.unitPrice) * item.quantity / 100).toFixed(2)}</Text>
            </View>
          ))}
          <View style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: '15px', fontWeight: 'bold' }}>Total</Text>
            <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
              ¥{(Number(order.totalAmount) / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Payment method selector */}
        {order.status === 'PENDING_PAYMENT' && (
          <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>
              Payment Method
            </Text>
            <Text style={{ fontSize: '12px', color: '#999', marginBottom: '10px', display: 'block' }}>
              Select one payment method. Only one coin type can be used per order.
            </Text>
            {PAY_OPTIONS.map((opt) => {
              const balance = opt.value !== 'FUIOU' ? (wallets[opt.value] ?? 0) : null
              const isSelected = payMethod === opt.value
              return (
                <View
                  key={opt.value}
                  onClick={() => setPayMethod(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '8px', marginBottom: '8px',
                    border: `2px solid ${isSelected ? opt.color : '#e8e8e8'}`,
                    background: isSelected ? opt.color + '10' : '#fff',
                  }}
                >
                  <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <View style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      border: `2px solid ${isSelected ? opt.color : '#ccc'}`,
                      background: isSelected ? opt.color : '#fff',
                    }} />
                    <View>
                      <Text style={{ fontSize: '14px', fontWeight: '500', color: isSelected ? opt.color : '#333' }}>
                        {opt.label}
                      </Text>
                      {balance !== null && (
                        <Text style={{ fontSize: '12px', color: '#999', display: 'block' }}>
                          Balance: {(balance / 100).toFixed(2)} {opt.sub}
                        </Text>
                      )}
                    </View>
                  </View>
                  {isSelected && (
                    <Text style={{ fontSize: '14px', color: opt.color, fontWeight: 'bold' }}>✓</Text>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* Delivery address */}
        {order.shippingAddress && (
          <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Delivery Address</Text>
            <Text style={{ fontSize: '13px', color: '#666' }}>
              {order.shippingAddress?.name} {order.shippingAddress?.phone}
            </Text>
            <Text style={{ fontSize: '13px', color: '#666', display: 'block' }}>
              {order.shippingAddress?.province} {order.shippingAddress?.city} {order.shippingAddress?.district} {order.shippingAddress?.detail}
            </Text>
          </View>
        )}

        {/* Note */}
        {order.remark && (
          <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px', display: 'block' }}>Note</Text>
            <Text style={{ fontSize: '13px', color: '#666' }}>{order.remark}</Text>
          </View>
        )}

        {/* Timestamps */}
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <Text style={{ fontSize: '12px', color: '#999' }}>Created</Text>
            <Text style={{ fontSize: '12px', color: '#666' }}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
          </View>
          {order.paidAt && (
            <View style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: '12px', color: '#999' }}>Paid</Text>
              <Text style={{ fontSize: '12px', color: '#666' }}>{order.paidAt?.slice(0, 16).replace('T', ' ')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {order.status === 'PENDING_PAYMENT' && (
        <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', paddingBottom: 'env(safe-area-inset-bottom, 0px)', display: 'flex', gap: '12px', boxShadow: '0 -2px 8px rgba(0,0,0,.08)' }}>
          <Button onClick={cancelOrder}
            style={{ flex: 1, background: '#fff', border: '1px solid #d9d9d9', borderRadius: '8px', color: '#666' }}>
            Cancel
          </Button>
          <Button onClick={pay} loading={paying}
            style={{ flex: 2, background: '#1677ff', color: '#fff', borderRadius: '8px' }}>
            Pay ¥{(Number(order.totalAmount) / 100).toFixed(2)}
          </Button>
        </View>
      )}
    </View>
  )
}
