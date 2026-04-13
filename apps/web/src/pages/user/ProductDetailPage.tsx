import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin, Empty, Tag, Button, Card, Typography, Modal } from 'antd'
import { ShopOutlined, FireOutlined, CarOutlined, CheckCircleOutlined, ArrowLeftOutlined, ShoppingCartOutlined, ThunderboltOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons'
import { useAuthStore } from '../../store/auth.store'
import { useWishlistStore } from '../../store/wishlist.store'

const { Title, Text } = Typography

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()
  const { has, toggle } = useWishlistStore()

  const [product, setProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/shop')
      return
    }
    api.getProduct(id)
      .then((p: any) => {
        setProduct(p)
        if (p?.variants?.length) setSelectedVariant(p.variants[0])
      })
      .catch(() => message.error('商品加载失败'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const requireAuth = () => {
    if (!token) {
      setLoginModalOpen(true)
      return false
    }
    return true
  }

  const addToCart = async () => {
    if (!selectedVariant) { message.error('请选择规格'); return }
    if (!requireAuth()) return
    setAdding(true)
    try {
      await api.addToCart({ productId: product.id, variantId: selectedVariant.id, quantity: qty })
      message.success('已加入购物车')
    } catch (err: any) { message.error(err || '加入失败') } finally { setAdding(false) }
  }

  const buyNow = async () => {
    if (!selectedVariant) { message.error('请选择规格'); return }
    if (!requireAuth()) return
    await addToCart()
    navigate('/portal/user/cart')
  }

  if (loading) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>
  if (!product) return <div style={{ padding: 80, textAlign: 'center' }}><Empty description="商品不存在或已下架" /></div>

  const price = Number(selectedVariant?.price ?? product.basePrice)
  const coinRate = parseFloat(product.coinOffsetRate ?? '0')
  const coinAmt = Math.round(price * coinRate)
  const cashAmt = price - coinAmt
  const isWishlisted = has(product.id)

  return (
    <div style={{ minHeight: '100%', paddingBottom: 100, background: '#f5f5f5' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f0f0f0' }}>
        <Button icon={<ArrowLeftOutlined />} shape="circle" onClick={() => navigate(-1)} />
        <Text strong style={{ fontSize: 16 }}>商品详情</Text>
        <div style={{ flex: 1 }} />
        <Button icon={isWishlisted ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />} shape="circle" onClick={() => { toggle(product.id); message.success(isWishlisted ? '已取消收藏' : '已收藏') }} />
      </div>

      <div style={{ background: '#fff' }}>
        <img src={product.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} alt={product.name} style={{ width: '100%', height: 320, objectFit: 'cover' }} />
      </div>

      <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>¥{(price / 100).toFixed(2)}</span>
          {coinRate > 0 && <Tag color="red"><FireOutlined /> 健康币可抵 {Math.round(coinRate * 100)}%</Tag>}
        </div>
        {coinRate > 0 && (
          <div style={{ background: '#fff2f0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#cf1322' }}>
              使用健康币抵扣后，预计仅需支付 <b>¥{(cashAmt / 100).toFixed(2)}</b> 现金
            </div>
          </div>
        )}
        <Title level={5} style={{ margin: 0, lineHeight: 1.4 }}>{product.name}</Title>
        <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>{product.description}</div>
        {product.requiresApproval && (
          <Tag color="orange" style={{ marginTop: 8 }}>需审核 / 处方药</Tag>
        )}
      </div>

      <Card style={{ margin: '0 12px 12px', borderRadius: 12 }} bodyStyle={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShopOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{product.merchant?.name || '平台自营'}</div>
            <div style={{ fontSize: 12, color: '#888' }}>企业认证 · 正品保障</div>
          </div>
          <Button size="small" onClick={() => navigate(`/shop?merchantId=${product.merchant?.id}`)}>进店逛逛</Button>
        </div>
      </Card>

      {product.variants?.length > 1 && (
        <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>选择规格</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {product.variants.map((v: any) => (
              <div
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${selectedVariant?.id === v.id ? '#1677ff' : '#d9d9d9'}`, color: selectedVariant?.id === v.id ? '#1677ff' : '#333', fontSize: 13, background: selectedVariant?.id === v.id ? '#e6f4ff' : '#fff', cursor: 'pointer', maxWidth: '100%', lineHeight: 1.3 }}
              >{v.name} ¥{(Number(v.price) / 100).toFixed(2)}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 14, color: '#333' }}>购买数量</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button shape="circle" onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
          <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{qty}</span>
          <Button shape="circle" onClick={() => setQty(qty + 1)}>+</Button>
        </div>
      </div>

      <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>服务说明</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}><CheckCircleOutlined style={{ color: '#52c41a' }} /> 正品保障</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}><CarOutlined style={{ color: '#1677ff' }} /> {product.deliveryType === 'DELIVERY' ? '快递配送' : '到店核销'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#555' }}><CheckCircleOutlined style={{ color: '#fa8c16' }} /> 7天无理由退换</div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: 12, boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
        <Button icon={<ShoppingCartOutlined />} style={{ flex: 1 }} onClick={addToCart} loading={adding}>加入购物车</Button>
        <Button type="primary" icon={<ThunderboltOutlined />} style={{ flex: 1 }} onClick={buyNow}>立即购买</Button>
      </div>

      <Modal
        open={loginModalOpen}
        title="需要登录"
        onCancel={() => setLoginModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setLoginModalOpen(false)}>稍后再说</Button>,
          <Button key="login" type="primary" onClick={() => navigate(`/login?from=${encodeURIComponent(location.pathname)}`)}>去登录</Button>,
        ]}
      >
        登录后即可加入购物车、下单购买和收藏商品。
      </Modal>
    </div>
  )
}
