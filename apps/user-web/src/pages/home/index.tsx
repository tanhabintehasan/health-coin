import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

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
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Search bar */}
      <div style={{ background: '#1677ff', padding: '12px 16px 16px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '8px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <span style={{ color: '#bbb', marginRight: '8px', fontSize: '16px' }}>&#128269;</span>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') fetchProducts() }}
            style={{ flex: 1, fontSize: '14px', border: 'none', outline: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {/* Categories */}
      <div style={{ background: '#fff', padding: '12px 0', borderBottom: '1px solid #f0f0f0', overflowX: 'auto' }}>
        <div style={{ display: 'flex', paddingLeft: '16px' }}>
          <div
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap',
              background: !selectedCategory ? '#1677ff' : '#f0f0f0',
              color: !selectedCategory ? '#fff' : '#333', fontSize: '13px', cursor: 'pointer',
            }}
          >
            All
          </div>
          {categories.map((c: any) => (
            <div
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{
                padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap',
                background: selectedCategory === c.id ? '#1677ff' : '#f0f0f0',
                color: selectedCategory === c.id ? '#fff' : '#333', fontSize: '13px', cursor: 'pointer',
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div
        style={{ padding: '12px', overflowY: 'auto' }}
        onScroll={(e) => {
          const target = e.currentTarget
          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 50) {
            if (!loading) fetchProducts(false)
          }
        }}
      >
        {/* Loading skeleton */}
        {loading && products.length === 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                style={{ width: '45%', margin: '2.5%', borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
              >
                <div style={{ width: '100%', height: '150px', background: '#e8e8e8' }} />
                <div style={{ padding: '8px' }}>
                  <div style={{ height: '12px', background: '#e8e8e8', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ height: '16px', background: '#e8e8e8', borderRadius: '4px', width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#128722;</div>
            <div style={{ fontSize: '16px', color: '#999', marginBottom: '4px' }}>No products found</div>
            <div style={{ fontSize: '13px', color: '#bbb' }}>Try a different search or category</div>
          </div>
        )}

        {/* Product cards */}
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {products.map((p: any) => (
            <div
              key={p.id}
              onClick={() => navigate(`/product?id=${p.id}`)}
              style={{ width: '45%', margin: '2.5%', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.1)', cursor: 'pointer' }}
            >
              <img
                src={p.images?.[0] || 'https://placehold.co/200x200?text=No+Image'}
                alt={p.name}
                style={{ width: '100%', height: '150px', objectFit: 'cover' }}
              />
              <div style={{ padding: '8px' }}>
                <div style={{ fontSize: '13px', color: '#333', marginBottom: '4px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {p.name}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{p.merchant?.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
                    ¥{(Number(p.basePrice) / 100).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#bbb' }}>&gt;</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading && products.length > 0 && (
          <div style={{ textAlign: 'center', padding: '16px' }}>
            <div style={{ color: '#999' }}>Loading more...</div>
          </div>
        )}
      </div>
    </div>
  )
}
