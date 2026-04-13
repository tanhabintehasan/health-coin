import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Input, Select, Card, Row, Col, Pagination, Spin, Empty, Button, Typography, Tag } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

const { Title } = Typography

export default function ShopPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const search = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const merchantId = searchParams.get('merchantId') || ''

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
      setMerchants((res?.data || []).map((m: any) => ({ value: m.id, label: m.name })))
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
        setProducts(res?.data || [])
        setTotal(res?.meta?.total || 0)
      })
      .catch(() => { setProducts([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [search, categoryId, merchantId, page])

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
    setPage(1)
  }

  return (
    <div style={{ padding: '32px 24px 64px', maxWidth: 1400, margin: '0 auto' }}>
      <Title level={3} style={{ marginBottom: 24 }}>积分商城</Title>

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索商品名称"
              value={search}
              onChange={(e) => updateFilter('search', e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={24} md={8}>
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
          <Col xs={24} md={8}>
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
        </Row>
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Empty description="暂无商品" />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => { setSearchParams({}); setPage(1) }}>清除筛选</Button>
        </div>
      ) : (
        <>
          <Row gutter={[24, 24]}>
            {products.map((p: any) => (
              <Col xs={24} sm={12} lg={6} key={p.id}>
                <Card
                  hoverable
                  cover={<img alt={p.name} src={p.images?.[0] || 'https://placehold.co/300x200?text=No+Image'} style={{ height: 200, objectFit: 'cover' }} />}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                  onClick={() => navigate(`/portal/user/product/${p.id}`)}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 18 }}>¥{(Number(p.basePrice) / 100).toFixed(2)}</span>
                    {Number(p.coinOffsetRate) > 0 && (
                      <Tag color="blue">可抵 {Math.round(Number(p.coinOffsetRate) * 100)}%</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>{p.merchant?.name || '平台自营'}</div>
                  {p.productType === 'SERVICE' && (
                    <Tag color="orange" style={{ marginTop: 8 }}>到店核销</Tag>
                  )}
                  {p.deliveryType === 'DELIVERY' && (
                    <Tag style={{ marginTop: 8 }}>快递配送</Tag>
                  )}
                </Card>
              </Col>
            ))}
          </Row>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Pagination current={page} pageSize={12} total={total} onChange={(p) => setPage(p)} showSizeChanger={false} />
          </div>
        </>
      )}
    </div>
  )
}
