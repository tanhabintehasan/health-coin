import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Input, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const fetchProducts = async (reset = true) => {
    setLoading(true)
    try {
      const params: any = { page: reset ? 1 : page, limit: 20 }
      if (search) params.search = search
      if (selectedCategory) params.categoryId = selectedCategory
      const res: any = await api.listProducts(params)
      const newItems = res.data ?? []
      setProducts(reset ? newItems : (prev) => [...prev, ...newItems])
      if (!reset) setPage((p) => p + 1)
      else setPage(2)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    fetchProducts()
  }, [])

  useEffect(() => { fetchProducts() }, [selectedCategory])

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ background: '#1677ff', padding: '12px 16px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '8px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <SearchOutlined style={{ color: '#bbb', marginRight: 8, fontSize: 16 }} />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchProducts()}
            style={{ flex: 1, fontSize: 14, border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      <div style={{ background: '#fff', padding: '12px 0', borderBottom: '1px solid #f0f0f0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', paddingLeft: '16px' }}>
          <div
            onClick={() => setSelectedCategory(null)}
            style={{ padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap', background: !selectedCategory ? '#1677ff' : '#f0f0f0', color: !selectedCategory ? '#fff' : '#333', fontSize: 13, cursor: 'pointer' }}
          >All</div>
          {categories.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{ padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap', background: selectedCategory === c.id ? '#1677ff' : '#f0f0f0', color: selectedCategory === c.id ? '#fff' : '#333', fontSize: 13, cursor: 'pointer' }}
            >{c.name}</div>
          ))}
        </div>
      </div>

      <div
        style={{ padding: 12, overflowY: 'auto', minHeight: 400 }}
        onScroll={(e) => {
          const target = e.currentTarget
          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
            if (!loading) fetchProducts(false)
          }
        }}
      >
        {loading && products.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {[1,2,3,4].map((n) => (
              <div key={n} style={{ width: '45%', margin: '2.5%', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                <div style={{ width: '100%', height: 150, background: '#e8e8e8' }} />
                <div style={{ padding: 8 }}>
                  <div style={{ height: 12, background: '#e8e8e8', borderRadius: 4, marginBottom: 8 }} />
                  <div style={{ height: 16, background: '#e8e8e8', borderRadius: 4, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
            <div style={{ fontSize: 16, color: '#999' }}>No products found</div>
            <div style={{ fontSize: 13, color: '#bbb' }}>Try a different search or category</div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {products.map((p: any) => (
            <div
              key={p.id}
              onClick={() => navigate(`/portal/user/product/${p.id}`)}
              style={{ width: '45%', margin: '2.5%', background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.1)', cursor: 'pointer' }}
            >
              <img src={p.images?.[0] || 'https://placehold.co/200x200?text=No+Image'} alt={p.name} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
              <div style={{ padding: 8 }}>
                <div style={{ fontSize: 13, color: '#333', marginBottom: 4, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{p.merchant?.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: '#1677ff' }}>¥{(Number(p.basePrice) / 100).toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: '#bbb' }}>&gt;</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && products.length > 0 && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Spin size="small" />
            <div style={{ color: '#999', marginTop: 4 }}>Loading more...</div>
          </div>
        )}
      </div>
    </div>
  )
}
