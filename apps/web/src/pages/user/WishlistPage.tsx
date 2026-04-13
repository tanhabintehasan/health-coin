import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Empty, Button, Spin, Tag, Badge, message } from 'antd'
import { ShoppingOutlined, FireOutlined, DeleteOutlined } from '@ant-design/icons'
import { useWishlistStore } from '../../store/wishlist.store'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

export default function WishlistPage() {
  const navigate = useNavigate()
  const { items, remove } = useWishlistStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isMobile } = useResponsive()

  useEffect(() => {
    if (items.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }
    api.listProducts({ limit: 100 })
      .then((res: any) => {
        const all = res?.data || []
        setProducts(all.filter((p: any) => items.includes(p.id)))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [items])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  if (products.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Empty description="暂无收藏商品">
          <Button type="primary" onClick={() => navigate('/shop')}>去商城逛逛</Button>
        </Empty>
      </div>
    )
  }

  return (
    <div style={{ padding: isMobile ? 12 : 24 }}>
      <h2>我的收藏</h2>
      <Row gutter={[isMobile ? 12 : 24, isMobile ? 12 : 24]} style={{ marginTop: 16 }}>
        {products.map((p: any) => {
          const coinRate = Number(p.coinOffsetRate || 0)
          return (
            <Col xs={24} sm={12} lg={6} key={p.id}>
              <Card
                hoverable
                cover={
                  <div style={{ position: 'relative' }}>
                    <img alt={p.name} src={p.images?.[0] || 'https://placehold.co/300x200?text=No+Image'} style={{ height: 160, objectFit: 'cover', width: '100%' }} />
                    {coinRate > 0 && (
                      <Badge count={`可抵${Math.round(coinRate * 100)}%`} style={{ backgroundColor: '#ff4d4f', position: 'absolute', top: 8, right: 8 }} />
                    )}
                    <div
                      onClick={(e) => { e.stopPropagation(); remove(p.id); message.success('已取消收藏') }}
                      style={{ position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                    </div>
                  </div>
                }
                style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}
                onClick={() => navigate(`/product/${p.id}`)}
              >
                <div style={{ fontWeight: 500, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18, marginBottom: 8 }}>¥{(Number(p.basePrice) / 100).toFixed(2)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ShoppingOutlined style={{ color: '#1677ff', fontSize: 12 }} />
                  <span style={{ fontSize: 12, color: '#666' }}>{p.merchant?.name || '平台自营'}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {p.productType === 'SERVICE' && <Tag color="orange">到店核销</Tag>}
                  {p.deliveryType === 'DELIVERY' && <Tag color="blue">快递配送</Tag>}
                  {coinRate > 0 && <Tag color="green"><FireOutlined /> 健康币抵扣</Tag>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
