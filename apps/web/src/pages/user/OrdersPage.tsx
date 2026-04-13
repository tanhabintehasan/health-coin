import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin, Empty, Button, Steps, Card, Tag, Input } from 'antd'
import { WalletOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useResponsive } from '../../hooks/useResponsive'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '待付款', PAID: '已付款', PROCESSING: '处理中', SHIPPED: '已发货',
  COMPLETED: '已完成', CANCELLED: '已取消', REFUNDING: '退款中', REFUNDED: '已退款',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#fa8c16', PAID: '#1677ff', PROCESSING: '#1677ff', SHIPPED: '#722ed1',
  COMPLETED: '#52c41a', CANCELLED: '#999', REFUNDING: '#ff4d4f', REFUNDED: '#999',
}

const WALLET_LABELS: Record<string, string> = {
  HEALTH_COIN: '健康币', MUTUAL_HEALTH_COIN: '互助币', UNIVERSAL_HEALTH_COIN: '万能币',
}

const WALLET_COLORS: Record<string, string> = {
  HEALTH_COIN: '#1677ff', MUTUAL_HEALTH_COIN: '#52c41a', UNIVERSAL_HEALTH_COIN: '#722ed1',
}

export default function OrdersPage() {
  const [searchParams] = useSearchParams()
  const itemsParam = searchParams.get('items')
  const navigate = useNavigate()
  const { isMobile } = useResponsive()

  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const checkoutMode = !!itemsParam
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [placing, setPlacing] = useState(false)
  const [walletBalances, setWalletBalances] = useState<Record<string, number>>({})

  let checkoutItems: any[] = []
  try { checkoutItems = itemsParam ? JSON.parse(decodeURIComponent(itemsParam)) : [] } catch {}
  const total = checkoutItems.reduce((sum: number, i: any) => sum + Number(i.subtotal), 0)

  const fetchWalletBalances = async () => {
    try {
      const wallets: any = await api.getWallets()
      const balanceMap: Record<string, number> = {}
      for (const w of wallets ?? []) balanceMap[w.walletType] = Number(w.balance)
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

  useEffect(() => {
    if (checkoutMode) { fetchWalletBalances() }
    else { fetchOrders() }
  }, [checkoutMode])

  const placeOrder = async () => {
    if (!address.trim()) { message.error('请输入收货地址'); return }
    setPlacing(true)
    try {
      const noteText = [address, note].filter(Boolean).join(' | ')
      const order = await api.createOrder({
        items: checkoutItems.map((i: any) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        note: noteText,
      })
      for (const item of checkoutItems) { await api.removeFromCart(item.productId, item.variantId).catch(() => {}) }
      navigate(`/portal/user/order/${order.id}`)
    } catch (err: any) { message.error(err || '下单失败') } finally { setPlacing(false) }
  }

  if (checkoutMode) {
    return (
      <div style={{ minHeight: '100%', paddingBottom: 100, background: '#f5f5f5' }}>
        <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Steps current={1} size={isMobile ? 'small' : undefined} items={[{ title: '购物车' }, { title: '确认订单' }, { title: '支付' }]} />
        </div>

        <Card style={{ margin: 12, borderRadius: 12 }} title="订单商品">
          {checkoutItems.map((item: any) => (
            <div key={`${item.productId}:${item.variantId}`} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <img src={item.product?.images?.[0] || 'https://placehold.co/80x80'} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#333' }}>{item.product?.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{item.variantName} x{item.quantity}</div>
                <div style={{ fontSize: 14, fontWeight: 'bold', color: '#f5222d', marginTop: 4 }}>¥{(Number(item.subtotal) / 100).toFixed(2)}</div>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, color: '#666' }}>商品总额</span>
            <span style={{ fontSize: 16, fontWeight: 'bold', color: '#f5222d' }}>¥{(total / 100).toFixed(2)}</span>
          </div>
        </Card>

        <Card style={{ margin: 12, borderRadius: 12 }} title="我的钱包余额">
          {(['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as const).map((wt) => (
            <div key={wt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WalletOutlined style={{ color: WALLET_COLORS[wt] }} />
                <span style={{ fontSize: 13, color: '#555' }}>{WALLET_LABELS[wt]}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: WALLET_COLORS[wt] }}>{((walletBalances[wt] ?? 0) / 100).toFixed(2)}</div>
            </div>
          ))}
          <div style={{ fontSize: 12, color: '#999', marginTop: 4, background: '#f6ffed', padding: '8px 12px', borderRadius: 6 }}>
            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
            下单后可在订单详情页选择一种健康币进行抵扣，每笔订单仅支持一种币抵扣。
          </div>
        </Card>

        <Card style={{ margin: 12, borderRadius: 12 }} title="收货地址">
          <Input.TextArea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="请输入详细收货地址（省市区 + 街道 + 门牌号）"
            rows={3}
            maxLength={200}
            showCount
          />
        </Card>

        <Card style={{ margin: 12, borderRadius: 12 }} title="订单备注">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="如有特殊要求，请在此备注"
            maxLength={100}
          />
        </Card>

        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: '#999' }}>合计</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#f5222d' }}>¥{(total / 100).toFixed(2)}</div>
          </div>
          <Button type="primary" size="large" loading={placing} onClick={placeOrder} disabled={!address.trim()}>
            提交订单
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>我的订单</div>
      </div>
      <div style={{ overflowY: 'auto' }}>
        {loading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}
        {!loading && !orders.length && (
          <div style={{ padding: '80px 24px', textAlign: 'center' }}>
            <Empty description="暂无订单" />
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/portal/user/home')}>去购物</Button>
          </div>
        )}
        {orders.map((order: any) => (
          <Card key={order.id} style={{ margin: 12, borderRadius: 12 }} bodyStyle={{ padding: 16 }} onClick={() => navigate(`/portal/user/order/${order.id}`)} hoverable>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#999' }}>订单号：{order.orderNo || order.id.slice(-8).toUpperCase()}</div>
              <Tag color={STATUS_COLOR[order.status] ?? '#999'}>{STATUS_LABEL[order.status] ?? order.status}</Tag>
            </div>
            <div style={{ marginBottom: 12 }}>
              {order.items?.slice(0, 2).map((item: any) => (
                <div key={item.id} style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <img src={item.product?.images?.[0] || 'https://placehold.co/60x60'} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#333' }}>{item.productName}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{item.variantName} x{item.quantity}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#333' }}>¥{(Number(item.subtotal) / 100).toFixed(2)}</div>
                </div>
              ))}
              {order.items?.length > 2 && <div style={{ fontSize: 12, color: '#999' }}>+{order.items.length - 2} 件商品</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <div style={{ fontSize: 12, color: '#999' }}>{order.createdAt?.slice(0, 10)}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f5222d' }}>¥{(Number(order.totalAmount) / 100).toFixed(2)}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
