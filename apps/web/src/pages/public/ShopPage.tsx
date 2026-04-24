import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Select, Card, Row, Col, Pagination, Spin, Empty, Button, Typography, Tag, Badge, Breadcrumb, message } from 'antd'
import { SearchOutlined, ShoppingOutlined, FireOutlined, ShopOutlined, HeartOutlined, HeartFilled } from '@ant-design/icons'
import { api } from '../../services/api'
import { useWishlistStore } from '../../store/wishlist.store'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography

const SORT_OPTIONS = [
  { value: 'default', label: '默认排序' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
  { value: 'coin_desc', label: '抵扣比例最高' },
]

export default function ShopPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { has, toggle } = useWishlistStore()
  const { isMobile } = useResponsive()

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const merchantId = searchParams.get('merchantId') || ''
  const sort = searchParams.get('sort') || 'default'

  useEffect(() => {
    api.getCategories().then((cats: any[]) => {
      const flat: any[] = []
      const walk = (nodes: any[]) => {
        nodes.forEach((n: any) => {
          flat.push({ value: n.id, label: n.name })
          if (n.children?.length) walk(n.children)
        })
      }
      walk(cats || [])
      setCategories(flat)
    }).catch(() => {})

    api.listMerchantsPublic({ limit: 100 }).then((res: any) => {
      setMerchants((res?.data || []).map((m: any) => ({ value: m.id, label: m.name, logo: m.logoUrl })))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params: any = { page, limit: 12 }
    if (search) params.search = search
    if (categoryId) params.categoryId = categoryId
    if (merchantId) params.merchantId = merchantId

    api.listProducts(params)
      .then((res: any) => {
        let list = res?.data || []
        if (sort === 'price_asc') list = list.sort((a: any, b: any) => Number(a.basePrice) - Number(b.basePrice))
        if (sort === 'price_desc') list = list.sort((a: any, b: any) => Number(b.basePrice) - Number(a.basePrice))
        if (sort === 'coin_desc') list = list.sort((a: any, b: any) => Number(b.coinOffsetRate) - Number(a.coinOffsetRate))
        setProducts(list)
        setTotal(res?.meta?.total || 0)
      })
      .catch(() => { setProducts([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [search, categoryId, merchantId, page, sort])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
    setPage(1)
  }

  const activeCategory = categories.find((c) => c.value === categoryId)
  const activeMerchant = merchants.find((m) => m.value === merchantId)

  return (
    <div style={{ padding: isMobile ? '16px 16px 48px' : '24px 24px 64px', maxWidth: 1400, margin: '0 auto' }}>
      <Breadcrumb style={{ marginBottom: 16 }} items={[{ title: <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>首页</span> }, { title: '积分商城' }]} />

      <div style={{ background: 'linear-gradient(90deg, #1677ff 0%, #4096ff 100%)', borderRadius: 16, padding: isMobile ? '20px 16px' : '32px 24px', color: '#fff', marginBottom: 24 }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}><ShoppingOutlined /> 积分商城</Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)' }}>严选健康好物，健康币可抵扣，多商户正品保障</Text>
      </div>

      <Card style={{ marginBottom: 24, borderRadius: 12 }} bodyStyle={{ padding: isMobile ? 16 : 24 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={7}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索商品名称"
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="全部分类"
              allowClear
              style={{ width: '100%' }}
              value={categoryId || undefined}
              onChange={(v) => updateFilter('categoryId', v || '')}
              options={categories}
              size="large"
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              placeholder="全部商户"
              allowClear
              style={{ width: '100%' }}
              value={merchantId || undefined}
              onChange={(v) => updateFilter('merchantId', v || '')}
              options={merchants}
              size="large"
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              placeholder="排序方式"
              style={{ width: '100%' }}
              value={sort}
              onChange={(v) => updateFilter('sort', v)}
              options={SORT_OPTIONS}
              size="large"
            />
          </Col>
        </Row>
        {(activeCategory || activeMerchant || search) && (
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Text type="secondary">当前筛选：</Text>
            {search && <Tag closable onClose={() => updateFilter('search', '')}>关键词：{search}</Tag>}
            {activeCategory && <Tag closable onClose={() => updateFilter('categoryId', '')}>分类：{activeCategory.label}</Tag>}
            {activeMerchant && <Tag closable onClose={() => updateFilter('merchantId', '')}>商户：{activeMerchant.label}</Tag>}
            <Button type="link" size="small" onClick={() => { setSearchParams({}); setPage(1) }}>清除全部</Button>
          </div>
        )}
      </Card>

      {loading && products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Empty description="暂无商品" />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => { setSearchParams({}); setPage(1) }}>清除筛选</Button>
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {products.map((p: any) => {
              const coinRate = Number(p.coinOffsetRate || 0)
              const coinAmt = Math.round(Number(p.basePrice) * coinRate)
              const isWishlisted = has(p.id)
              return (
                <Col xs={24} sm={12} lg={6} key={p.id}>
                  <Card
                    hoverable
                    cover={
                      <div style={{ position: 'relative' }}>
                        <img alt={p.name} src={p.images?.[0] || 'https://placehold.co/300x300?text=No+Image'} style={{ aspectRatio: '1 / 1', objectFit: 'cover', width: '100%' }} />
                        {coinRate > 0 && (
                          <Badge count={`可抵${Math.round(coinRate * 100)}%`} style={{ backgroundColor: '#ff4d4f', position: 'absolute', top: 8, right: 8 }} />
                        )}
                        <div
                          onClick={(e) => { e.stopPropagation(); toggle(p.id); message.success(isWishlisted ? '已取消收藏' : '已收藏') }}
                          style={{ position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          {isWishlisted ? <HeartFilled style={{ color: '#ff4d4f', fontSize: 18 }} /> : <HeartOutlined style={{ color: '#999', fontSize: 18 }} />}
                        </div>
                      </div>
                    }
                    style={{ borderRadius: 12, overflow: 'hidden' }}
                    onClick={() => navigate(`/product/${p.id}`)}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>¥{(Number(p.basePrice) / 100).toFixed(2)}</span>
                        {coinRate > 0 && (
                          <span style={{ color: '#999', fontSize: 12, marginLeft: 8, textDecoration: 'line-through' }}>¥{((Number(p.basePrice) + coinAmt) / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <ShopOutlined style={{ color: '#1677ff', fontSize: 12 }} />
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

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40, overflowX: 'auto' }}>
            <Pagination current={page} pageSize={12} total={total} onChange={(p) => setPage(p)} showSizeChanger={false} size={isMobile ? 'small' : 'default'} />
          </div>
        </>
      )}
    </div>
  )
}
