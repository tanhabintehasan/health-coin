import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin, Empty, Button, Card, Steps, Divider } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, WalletOutlined, WechatOutlined, AlipayOutlined, CreditCardOutlined, FireOutlined } from '@ant-design/icons'
import { useSettingsStore } from '../../store/settings.store'
import { useResponsive } from '../../hooks/useResponsive'

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: '待付款', PAID: '已付款', PROCESSING: '处理中', SHIPPED: '已发货',
  COMPLETED: '已完成', CANCELLED: '已取消', REFUNDING: '退款中', REFUNDED: '已退款',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: '#fa8c16', PAID: '#1677ff', PROCESSING: '#1677ff', SHIPPED: '#722ed1',
  COMPLETED: '#52c41a', CANCELLED: '#999', REFUNDING: '#ff4d4f', REFUNDED: '#999',
}

const STATUS_STEP: Record<string, number> = {
  PENDING_PAYMENT: 0, PAID: 1, PROCESSING: 2, SHIPPED: 3, COMPLETED: 4,
  CANCELLED: -1, REFUNDING: -1, REFUNDED: -1,
}

type CoinType = 'HEALTH_COIN' | 'MUTUAL_HEALTH_COIN' | 'UNIVERSAL_HEALTH_COIN'

const WALLET_META: Record<CoinType, { label: string; color: string; icon: any }> = {
  HEALTH_COIN: { label: '健康币支付', color: '#1677ff', icon: <WalletOutlined /> },
  MUTUAL_HEALTH_COIN: { label: '互助币支付', color: '#52c41a', icon: <WalletOutlined /> },
  UNIVERSAL_HEALTH_COIN: { label: '万能币支付', color: '#722ed1', icon: <WalletOutlined /> },
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { settings, fetchSettings } = useSettingsStore()
  const { isMobile } = useResponsive()

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [payMethod, setPayMethod] = useState<'FUIOU' | 'WECHAT' | 'ALIPAY' | CoinType>('FUIOU')
  const [wallets, setWallets] = useState<Record<string, number>>({})

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const fetchOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [res, walletsRes]: any[] = await Promise.all([api.getOrder(id), api.getWallets()])
      setOrder(res)
      const balMap: Record<string, number> = {}
      for (const w of walletsRes ?? []) balMap[w.walletType] = Number(w.balance)
      setWallets(balMap)
    } catch { message.error('加载订单失败') } finally { setLoading(false) }
  }, [id])

  useEffect(() => { fetchOrder() }, [fetchOrder])

  const buildPayOptions = () => {
    const opts: Array<{ value: 'FUIOU' | 'WECHAT' | 'ALIPAY' | CoinType; label: string; sub: string; color: string; icon: any }> = []
    if (settings?.payments.fuiou) opts.push({ value: 'FUIOU', label: '富友聚合支付', sub: '支持微信 / 支付宝 / 银行卡', color: '#1677ff', icon: <CreditCardOutlined /> })
    if (settings?.payments.wechat) opts.push({ value: 'WECHAT', label: '微信支付', sub: '微信安全支付', color: '#07c160', icon: <WechatOutlined /> })
    if (settings?.payments.alipay) opts.push({ value: 'ALIPAY', label: '支付宝', sub: '支付宝快捷支付', color: '#1677ff', icon: <AlipayOutlined /> })
    if (settings?.payments.coin) {
      ;(['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'] as CoinType[]).forEach((wt) => {
        const m = WALLET_META[wt]
        opts.push({ value: wt, label: m.label, sub: `余额 ${((wallets[wt] ?? 0) / 100).toFixed(2)}`, color: m.color, icon: m.icon })
      })
    }
    if (opts.length && !opts.find((o) => o.value === payMethod)) setPayMethod(opts[0].value as any)
    return opts
  }

  const payOptions = buildPayOptions()

  const pay = async () => {
    if (!id) return
    setPaying(true)
    try {
      const isCoin = ['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'].includes(payMethod)
      const walletType = isCoin ? (payMethod as CoinType) : undefined
      const res: any = await api.payOrder(id, walletType)
      if (res.payUrl) { window.open(res.payUrl, '_blank'); message.info('正在跳转支付...') }
      else if (res.payParams) { message.success('支付参数已生成，请在收银台完成支付'); fetchOrder() }
      else { message.success('支付成功'); fetchOrder() }
    } catch (err: any) { message.error(err || '支付失败') } finally { setPaying(false) }
  }

  const cancel = async () => {
    if (!id) return
    const ok = window.confirm('确定取消该订单吗？')
    if (!ok) return
    try { await api.cancelOrder(id); message.success('订单已取消'); fetchOrder() }
    catch (err: any) { message.error(err || '取消失败') }
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
  if (!order) return <div style={{ padding: 80, textAlign: 'center' }}><Empty description="订单不存在" /></div>

  const stepIndex = STATUS_STEP[order.status] ?? 0
  const coinRate = parseFloat(order.coinOffsetRate ?? '0')
  const totalAmt = Number(order.totalAmount)
  const coinAmt = Math.round(totalAmt * coinRate)
  const cashAmt = totalAmt - coinAmt

  return (
    <div style={{ minHeight: '100%', paddingBottom: order.status === 'PENDING_PAYMENT' ? 100 : 0, background: '#f5f5f5' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button icon={<ArrowLeftOutlined />} shape="circle" onClick={() => navigate(-1)} />
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>订单详情</span>
      </div>

      <div style={{ background: STATUS_COLOR[order.status] ?? '#1677ff', padding: '24px 16px', color: '#fff' }}>
        <div style={{ fontSize: 20, fontWeight: 'bold' }}>{STATUS_LABEL[order.status] ?? order.status}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>订单号：{order.orderNo || order.id?.slice(-8).toUpperCase()}</div>
      </div>

      {stepIndex >= 0 && (
        <Card style={{ margin: 12, borderRadius: 12 }} bodyStyle={{ padding: '16px 8px' }}>
          <Steps current={stepIndex} size={isMobile ? 'small' : undefined} items={[
            { title: '待付款' }, { title: '已付款' }, { title: '处理中' }, { title: '已发货' }, { title: '已完成' }
          ]} />
        </Card>
      )}

      <Card style={{ margin: 12, borderRadius: 12 }} title="商品信息">
        {order.items?.map((item: any) => (
          <div key={item.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <img src={item.product?.images?.[0] || 'https://placehold.co/80x80'} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#333' }}>{item.productName}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{item.variantName} x{item.quantity}</div>
              {item.redemptionCode && (
                <div style={{ marginTop: 8, background: '#f6ffed', borderRadius: 6, padding: '8px 12px', display: 'inline-block' }}>
                  <div style={{ fontSize: 11, color: '#888' }}>核销码</div>
                  <div style={{ fontSize: 16, fontWeight: 'bold', color: '#52c41a', letterSpacing: 2 }}>{item.redemptionCode}</div>
                  {item.validUntil && <div style={{ fontSize: 11, color: '#fa8c16' }}>有效期至 {new Date(item.validUntil).toLocaleDateString('zh-CN')}</div>}
                  <div style={{ fontSize: 11, color: '#52c41a' }}>{item.redeemedCount || 0}/{item.redeemableCount || 1} 已核销</div>
                </div>
              )}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#333', whiteSpace: 'nowrap' }}>¥{(Number(item.unitPrice) * item.quantity / 100).toFixed(2)}</div>
          </div>
        ))}
        <Divider style={{ margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#666' }}>商品总额</span>
          <span>¥{(totalAmt / 100).toFixed(2)}</span>
        </div>
        {coinRate > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#666' }}>健康币抵扣 ({Math.round(coinRate * 100)}%)</span>
            <span style={{ color: '#52c41a' }}>-¥{(coinAmt / 100).toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>应付总额</span>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#f5222d' }}>¥{(totalAmt / 100).toFixed(2)}</span>
        </div>
        {coinRate > 0 && (
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            <FireOutlined style={{ color: '#ff4d4f' }} /> 若选择健康币支付，预计现金支付 ¥{(cashAmt / 100).toFixed(2)}
          </div>
        )}
      </Card>

      {order.status === 'PENDING_PAYMENT' && (
        <Card style={{ margin: 12, borderRadius: 12 }} title="选择支付方式">
          <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>每笔订单仅支持一种支付方式，请根据余额和优惠选择。</div>
          {payOptions.length === 0 && <Empty description="当前无可用的支付方式" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          {payOptions.map((opt) => {
            const isSelected = payMethod === opt.value
            const isCoin = ['HEALTH_COIN', 'MUTUAL_HEALTH_COIN', 'UNIVERSAL_HEALTH_COIN'].includes(opt.value)
            const disabled = isCoin && (wallets[opt.value] ?? 0) < totalAmt
            return (
              <div
                key={opt.value}
                onClick={() => { if (!disabled) setPayMethod(opt.value as any) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8, marginBottom: 8,
                  border: `2px solid ${isSelected ? opt.color : '#e8e8e8'}`,
                  background: disabled ? '#f5f5f5' : (isSelected ? opt.color + '10' : '#fff'),
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 18, color: opt.color }}>{opt.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: isSelected ? opt.color : '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt.sub}</div>
                  </div>
                </div>
                <div>{isSelected ? <CheckCircleOutlined style={{ color: opt.color, fontSize: 18 }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #ccc' }} />}</div>
              </div>
            )
          })}
        </Card>
      )}

      {order.shippingAddress && (
        <Card style={{ margin: 12, borderRadius: 12 }} title="收货地址">
          <div style={{ fontSize: 14, color: '#333' }}>
            {order.shippingAddress?.name} {order.shippingAddress?.phone}
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {order.shippingAddress?.province} {order.shippingAddress?.city} {order.shippingAddress?.district} {order.shippingAddress?.detail}
          </div>
        </Card>
      )}

      {order.remark && (
        <Card style={{ margin: 12, borderRadius: 12 }} title="订单备注">
          <div style={{ fontSize: 13, color: '#666' }}>{order.remark}</div>
        </Card>
      )}

      <Card style={{ margin: 12, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: '#999' }}>下单时间</div>
          <div style={{ fontSize: 12, color: '#666' }}>{order.createdAt?.slice(0, 16).replace('T', ' ')}</div>
        </div>
        {order.paidAt && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: '#999' }}>付款时间</div>
            <div style={{ fontSize: 12, color: '#666' }}>{order.paidAt?.slice(0, 16).replace('T', ' ')}</div>
          </div>
        )}
      </Card>

      {order.status === 'PENDING_PAYMENT' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: 12, boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
          <Button style={{ flex: 1 }} onClick={cancel}>取消订单</Button>
          <Button type="primary" style={{ flex: 2 }} loading={paying} onClick={pay} disabled={payOptions.length === 0}>
            {paying ? '支付中...' : `立即支付 ¥${(totalAmt / 100).toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  )
}
