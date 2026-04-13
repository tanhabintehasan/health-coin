import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin } from 'antd'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment', PAID: 'Paid', PROCESSING: 'Processing', SHIPPED: 'Shipped',
  COMPLETED: 'Completed', CANCELLED: 'Cancelled', REFUNDING: 'Refunding', REFUNDED: 'Refunded',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#fa8c16', PAID: '#1677ff', PROCESSING: '#1677ff', SHIPPED: '#722ed1',
  COMPLETED: '#52c41a', CANCELLED: '#999', REFUNDING: '#ff4d4f', REFUNDED: '#999',
}

type CoinType = 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN'

const PAY_OPTIONS: Array<{ value: 'FUIOU' | CoinType; label: string; sub: string; color: string }> = [
  { value: 'FUIOU', label: 'WeChat Pay', sub: 'Pay with WeChat / Alipay', color: '#07c160' },
  { value: 'HEALTH_COIN', label: 'HealthCoin', sub: 'HC', color: '#1677ff' },
  { value: 'MUTUAL_HEALTH_COIN', label: 'Mutual HealthCoin', sub: 'MHC', color: '#52c41a' },
  { value: 'UNIVERSAL_HEALTH_COIN', label: 'Universal HealthCoin', sub: 'UHC', color: '#722ed1' },
]

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'FUIOU' | CoinType>('FUIOU')
  const [wallets, setWallets] = useState<Record<string, number>>({})

  const fetchOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [res, walletsRes]: any[] = await Promise.all([api.getOrder(id), api.getWallets()])
      setOrder(res)
      const balMap: Record<string, number> = {}
      for (const w of walletsRes ?? []) balMap[w.walletType] = Number(w.balance)
      setWallets(balMap)
    } catch { navigate(-1) } finally { setLoading(false) }
  }, [id, navigate])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const pay = async () => {
    if (!id) return
    setPaying(true)
    try {
      const walletType = payMethod === 'FUIOU' ? undefined : payMethod
      const res: any = await api.payOrder(id, walletType)
      if (res.payUrl) { window.open(res.payUrl, '_blank'); message.info('Redirecting to payment...') }
      else { message.success('Payment successful'); fetchOrder() }
    } catch (err: any) { message.error(err || 'Payment failed') } finally { setPaying(false) }
  }

  const cancel = async () => {
    if (!id) return
    const ok = window.confirm('Are you sure you want to cancel this order?')
    if (!ok) return
    try { await api.cancelOrder(id); message.success('Order cancelled'); fetchOrder() }
    catch (err: any) { message.error(err || 'Failed to cancel') }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
  if (!order) return null

  return (
    <div style={{ minHeight: '100%', paddingBottom: order.status === 'PENDING_PAYMENT' ? 80 : 0 }}>
      <div style={{ overflowY: 'auto' }}>
        <div style={{ background: STATUS_COLOR[order.status] ?? '#1677ff', padding: '20px 16px' }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>{STATUS_LABEL[order.status] ?? order.status}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)' }}>Order #{order.orderNo ?? order.id?.slice(-8).toUpperCase()}</div>
        </div>

        <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Items</div>
          {order.items?.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#333' }}>{item.productName}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{item.variantName} x{item.quantity}</div>
                {item.redemptionCode && (
                  <div style={{ marginTop: 6, background: '#f6f8ff', borderRadius: 6, padding: '6px 10px', display: 'inline-flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: 11, color: '#999' }}>Redemption Code</div>
                    <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1677ff', letterSpacing: 2 }}>{item.redemptionCode}</div>
                    {item.validUntil && <div style={{ fontSize: 11, color: '#fa8c16' }}>Valid until {new Date(item.validUntil).toLocaleDateString('zh-CN')}</div>}
                    <div style={{ fontSize: 11, color: '#52c41a' }}>{item.redeemedCount}/{item.redeemableCount} redeemed</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: '#1677ff' }}>¥{(Number(item.unitPrice) * item.quantity / 100).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 15, fontWeight: 'bold' }}>Total</div>
            <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1677ff' }}>¥{(Number(order.totalAmount) / 100).toFixed(2)}</div>
          </div>
        </div>

        {order.status === 'PENDING_PAYMENT' && (
          <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Payment Method</div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Select one payment method. Only one coin type can be used per order.</div>
            {PAY_OPTIONS.map((opt) => {
              const balance = opt.value !== 'FUIOU' ? (wallets[opt.value] ?? 0) : null
              const isSelected = payMethod === opt.value
              return (
                <div key={opt.value} onClick={() => setPayMethod(opt.value)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8, border: `2px solid ${isSelected ? opt.color : '#e8e8e8'}`, background: isSelected ? opt.color + '10' : '#fff', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${isSelected ? opt.color : '#ccc'}`, background: isSelected ? opt.color : '#fff' }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: isSelected ? opt.color : '#333' }}>{opt.label}</div>
                      {balance !== null && <div style={{ fontSize: 12, color: '#999' }}>Balance: {(balance / 100).toFixed(2)} {opt.sub}</div>}
                    </div>
                  </div>
                  {isSelected && <div style={{ fontSize: 14, color: opt.color, fontWeight: 'bold' }}>✓</div>}
                </div>
              )
            })}
          </div>
        )}

        {order.shippingAddress && (
          <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Delivery Address</div>
            <div style={{ fontSize: 13, color: '#666' }}>{order.shippingAddress?.name} {order.shippingAddress?.phone}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{order.shippingAddress?.province} {order.shippingAddress?.city} {order.shippingAddress?.district} {order.shippingAddress?.detail}</div>
          </div>
        )}

        {order.remark && (
          <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Note</div>
            <div style={{ fontSize: 13, color: '#666' }}>{order.remark}</div>
          </div>
        )}

        <div style={{ background: '#fff', margin: 12, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 12, color: '#999' }}>Created</div>
            <div style={{ fontSize: 12, color: '#666' }}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</div>
          </div>
          {order.paidAt && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12, color: '#999' }}>Paid</div>
              <div style={{ fontSize: 12, color: '#666' }}>{order.paidAt?.slice(0, 16).replace('T', ' ')}</div>
            </div>
          )}
        </div>
      </div>

      {order.status === 'PENDING_PAYMENT' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: 12, boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
          <button onClick={cancel} style={{ flex: 1, background: '#fff', border: '1px solid #d9d9d9', borderRadius: 8, color: '#666', padding: 10, fontSize: 14 }}>Cancel</button>
          <button onClick={pay} disabled={paying} style={{ flex: 2, background: '#1677ff', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14, opacity: paying ? 0.7 : 1 }}>
            {paying ? 'Processing...' : `Pay ¥${(Number(order.totalAmount) / 100).toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  )
}
