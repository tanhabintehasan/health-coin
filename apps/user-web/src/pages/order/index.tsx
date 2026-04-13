import { useState } from 'react'
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
  const [searchParams] = useSearchParams()
  const itemsParam = searchParams.get('items')
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const checkoutMode = !!itemsParam
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({})

  let checkoutItems: any[] = []
  try {
    checkoutItems = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : []
  } catch {}
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
    } catch {}
    finally { setLoading(false) }
  }

  usePageVisible(() => {
    if (checkoutMode) {
      fetchWalletBalances()
    } else {
      fetchOrders()
    }
  })

  const placeOrder = async () => {
    if (!address.trim()) {
      showToast('Enter delivery address', 'error')
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
      navigate(`/order-detail?id=${order.id}`)
    } catch (err: any) {
      showToast(err || 'Failed to place order', 'error')
    } finally {
      setPlacing(false)
    }
  }

  if (checkoutMode) {
    return (
      <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
        {/* Step indicator */}
        <div style={{ background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
          {[
            { num: '1', label: 'Review' },
            { num: '2', label: 'Address' },
            { num: '3', label: 'Pay' },
          ].map((step, idx) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: idx === 0 ? '#1677ff' : '#e0e0e0',
                }}>
                  <span style={{ fontSize: '12px', color: idx === 0 ? '#fff' : '#999', fontWeight: 'bold' }}>{step.num}</span>
                </div>
                <span style={{ fontSize: '12px', color: idx === 0 ? '#1677ff' : '#999', fontWeight: idx === 0 ? 500 : 'normal' }}>{step.label}</span>
              </div>
              {idx < 2 && <span style={{ color: '#d0d0d0', margin: '0 8px', fontSize: '14px' }}>→</span>}
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '12px' }}>Order Summary</div>
          {checkoutItems.map((item: any) => (
            <div key={`${item.productId}:${item.variantId}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#333' }}>{item.product?.name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}> x{item.quantity}</div>
              </div>
              <div style={{ fontSize: '13px', color: '#1677ff' }}>¥{(Number(item.subtotal) / 100).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: '12px', paddingTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>Total</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>¥{(total / 100).toFixed(2)}</div>
          </div>
        </div>

        {/* Coin Balances */}
        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '12px' }}>Your Coin Balances</div>
          {(['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const).map((wt) => (
            <div key={wt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', color: '#555' }}>{WALLET_LABELS[wt]}</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: WALLET_COLORS[wt] }}>
                {((walletBalances[wt] ?? 0) / 100).toFixed(2)}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
            You can choose payment method on the next screen after placing your order.
          </div>
        </div>

        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', color: '#333', fontWeight: 500 }}>Delivery Address</div>
            <div style={{ color: '#ff4d4f', marginLeft: '2px', fontSize: '14px' }}> *</div>
          </div>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '48px' }}>
            <div style={{ fontSize: '14px', color: address ? '#333' : '#bbb', flex: 1 }}>
              {address || 'No address entered'}
            </div>
            <button
              onClick={() => {
                const val = window.prompt('Enter Address', 'Street, City, Province')
                if (val) setAddress(val)
              }}
              style={{ marginLeft: '12px', padding: '4px 8px', background: '#f0f0f0', borderRadius: '6px', fontSize: '12px', color: '#555', border: 'none' }}
            >
              &#9998; Edit
            </button>
          </div>
        </div>

        <div style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>Note (optional)</div>
          <div
            style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', minHeight: '60px', cursor: 'pointer' }}
            onClick={() => {
              const val = window.prompt('Add Note', 'Special instructions...')
              if (val !== null) setNote(val || '')
            }}
          >
            <div style={{ fontSize: '14px', color: note ? '#333' : '#bbb' }}>
              {note || 'Tap to add note'}
            </div>
          </div>
        </div>

        <div style={{
          position: 'fixed', bottom: '60px', left: 0, right: 0, background: '#fff', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40,
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>¥{(total / 100).toFixed(2)}</div>
          <button onClick={placeOrder} disabled={placing} style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px 32px', fontSize: '14px', opacity: placing ? 0.7 : 1 }}>
            {placing ? 'Placing...' : 'Place Order'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ color: '#999' }}>Loading...</div>
          </div>
        )}
        {!loading && !orders.length && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '16px', color: '#999' }}>No orders yet</div>
          </div>
        )}
        {orders.map((order: any) => (
          <div
            key={order.id}
            onClick={() => navigate(`/order-detail?id=${order.id}`)}
            style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#999' }}>#{order.id.slice(-8).toUpperCase()}</div>
              <div style={{ fontSize: '12px', color: STATUS_COLOR[order.status] ?? '#999', fontWeight: 500 }}>
                {STATUS_LABEL[order.status] ?? order.status}
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              {order.items?.slice(0, 2).map((item: any) => (
                <div key={item.id} style={{ fontSize: '13px', color: '#333' }}>
                  {item.productName} x{item.quantity}
                </div>
              ))}
              {order.items?.length > 2 && (
                <div style={{ fontSize: '12px', color: '#999' }}>+{order.items.length - 2} more</div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '12px', color: '#999' }}>{order.createdAt?.slice(0, 10)}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
                ¥{(Number(order.totalAmount) / 100).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
