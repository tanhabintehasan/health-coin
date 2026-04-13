import { useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useToast } from '../../hooks/useToast'

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
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'FUIOU' | CoinType>('FUIOU')
  const [wallets, setWallets] = useState<Record<string, number>>({})

  const fetchOrder = useCallback(async () => {
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
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  usePageVisible(() => { fetchOrder() })

  const pay = async () => {
    if (!id) return
    setPaying(true)
    try {
      const walletType = payMethod === 'FUIOU' ? undefined : payMethod
      const res = await api.payOrder(id, walletType)
      if (res.payUrl) {
        window.open(res.payUrl, '_blank')
        showToast('Redirecting to payment...', 'info')
      } else {
        showToast('Payment successful', 'success')
        fetchOrder()
      }
    } catch (err: any) {
      showToast(err || 'Payment failed', 'error')
    } finally {
      setPaying(false)
    }
  }

  const cancelOrder = async () => {
    if (!id) return
    const ok = window.confirm('Are you sure you want to cancel this order?')
    if (!ok) return
    try {
      await api.cancelOrder(id)
      showToast('Order cancelled', 'success')
      fetchOrder()
    } catch (err: any) {
      showToast(err || 'Failed to cancel', 'error')
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!order) return null

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ overflowY: 'auto' }}>
        {/* Status header */}
        <div style={{ background: STATUS_COLOR[order.status] ?? '#1677ff', padding: '20px 16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
            {STATUS_LABEL[order.status] ?? order.status}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,.8)' }}>Order #{order.orderNo ?? order.id?.slice(-8).toUpperCase()}</div>
        </div>

        {/* Items */}
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Items</div>
          {order.items?.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#333' }}>{item.productName}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{item.variantName} x{item.quantity}</div>
                {item.redemptionCode && (
                  <div style={{ marginTop: '6px', background: '#f6f8ff', borderRadius: '6px', padding: '6px 10px', display: 'inline-flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', color: '#999' }}>Redemption Code</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff', letterSpacing: '2px' }}>
                      {item.redemptionCode}
                    </div>
                    {item.validUntil && (
                      <div style={{ fontSize: '11px', color: '#fa8c16' }}>
                        Valid until {new Date(item.validUntil).toLocaleDateString('zh-CN')}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#52c41a' }}>
                      {item.redeemedCount}/{item.redeemableCount} redeemed
                    </div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#1677ff' }}>¥{(Number(item.unitPrice) * item.quantity / 100).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>Total</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
              ¥{(Number(order.totalAmount) / 100).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Payment method selector */}
        {order.status === 'PENDING_PAYMENT' && (
          <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>
              Payment Method
            </div>
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
              Select one payment method. Only one coin type can be used per order.
            </div>
            {PAY_OPTIONS.map((opt) => {
              const balance = opt.value !== 'FUIOU' ? (wallets[opt.value] ?? 0) : null
              const isSelected = payMethod === opt.value
              return (
                <div
                  key={opt.value}
                  onClick={() => setPayMethod(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px', borderRadius: '8px', marginBottom: '8px',
                    border: `2px solid ${isSelected ? opt.color : '#e8e8e8'}`,
                    background: isSelected ? opt.color + '10' : '#fff', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      border: `2px solid ${isSelected ? opt.color : '#ccc'}`,
                      background: isSelected ? opt.color : '#fff',
                    }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: isSelected ? opt.color : '#333' }}>
                        {opt.label}
                      </div>
                      {balance !== null && (
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Balance: {(balance / 100).toFixed(2)} {opt.sub}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div style={{ fontSize: '14px', color: opt.color, fontWeight: 'bold' }}>✓</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Delivery address */}
        {order.shippingAddress && (
          <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Delivery Address</div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {order.shippingAddress?.name} {order.shippingAddress?.phone}
            </div>
            <div style={{ fontSize: '13px', color: '#666' }}>
              {order.shippingAddress?.province} {order.shippingAddress?.city} {order.shippingAddress?.district} {order.shippingAddress?.detail}
            </div>
          </div>
        )}

        {/* Note */}
        {order.remark && (
          <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Note</div>
            <div style={{ fontSize: '13px', color: '#666' }}>{order.remark}</div>
          </div>
        )}

        {/* Timestamps */}
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ fontSize: '12px', color: '#999' }}>Created</div>
            <div style={{ fontSize: '12px', color: '#666' }}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</div>
          </div>
          {order.paidAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: '#999' }}>Paid</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{order.paidAt?.slice(0, 16).replace('T', ' ')}</div>
            </div>
          )}
        </div>
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <div style={{
          position: 'fixed', bottom: '60px', left: 0, right: 0, background: '#fff', padding: '12px 16px',
          display: 'flex', gap: '12px', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40,
        }}>
          <button onClick={cancelOrder} style={{ flex: 1, background: '#fff', border: '1px solid #d9d9d9', borderRadius: '8px', color: '#666', padding: '10px', fontSize: '14px' }}>
            Cancel
          </button>
          <button onClick={pay} disabled={paying} style={{ flex: 2, background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '14px', opacity: paying ? 0.7 : 1 }}>
            {paying ? 'Processing...' : `Pay ¥${(Number(order.totalAmount) / 100).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  )
}
