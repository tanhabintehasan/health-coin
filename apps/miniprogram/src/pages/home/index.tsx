import { useState, useEffect } from 'react'
import { View, Text, Input, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { api } from '../../services/api'

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchProducts = async (reset = true) => {
    setLoading(true)
    try {
      const currentPage = reset ? 1 : page
      const params: any = { page: currentPage, limit: 20 }
      if (search) params.search = search
      if (selectedCategory) params.categoryId = selectedCategory
      const res: any = await api.listProducts(params)
      const newItems = res.data ?? []
      setProducts(reset ? newItems : (prev) => [...prev, ...newItems])
      setPage(currentPage + 1)
    } catch (err: any) {
      Taro.showToast({ title: err || 'Failed to load products', icon: 'error' })
    } finally { setLoading(false) }
  }

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {})
    fetchProducts()
  }, [])

  useEffect(() => { fetchProducts() }, [selectedCategory])

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Search bar */}
      <View style={{ background: '#1677ff', padding: '12px 16px 16px' }}>
        <View style={{ background: '#fff', borderRadius: '24px', padding: '8px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <Text style={{ color: '#bbb', marginRight: '8px', fontSize: '16px' }}>&#128269;</Text>
          <Input
            placeholder='Search products...'
            value={search}
            onInput={(e) => setSearch(e.detail.value)}
            onConfirm={() => fetchProducts()}
            style={{ flex: 1, fontSize: '14px', border: 'none', outline: 'none' }}
          />
        </View>
      </View>

      {/* Categories */}
      <ScrollView scrollX style={{ background: '#fff', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
        <View style={{ display: 'flex', paddingLeft: '16px' }}>
          <View
            onClick={() => setSelectedCategory(null)}
            style={{
              padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap',
              background: !selectedCategory ? '#1677ff' : '#f0f0f0',
              color: !selectedCategory ? '#fff' : '#333', fontSize: '13px',
            }}
          >
            <Text>All</Text>
          </View>
          {categories.map((c: any) => (
            <View
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{
                padding: '4px 16px', borderRadius: '16px', marginRight: '8px', whiteSpace: 'nowrap',
                background: selectedCategory === c.id ? '#1677ff' : '#f0f0f0',
                color: selectedCategory === c.id ? '#fff' : '#333', fontSize: '13px',
              }}
            >
              <Text>{c.name}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Product grid */}
      <ScrollView scrollY style={{ padding: '12px' }} onScrollToLower={() => fetchProducts(false)}>
        {/* Loading skeleton */}
        {loading && products.length === 0 && (
          <View style={{ display: 'flex', flexWrap: 'wrap' as const }}>
            {[1, 2, 3, 4].map((n) => (
              <View
                key={n}
                style={{ width: '45%', margin: '2.5%', borderRadius: '10px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}
              >
                <View style={{ width: '100%', height: '150px', background: '#e8e8e8' }} />
                <View style={{ padding: '8px' }}>
                  <View style={{ height: '12px', background: '#e8e8e8', borderRadius: '4px', marginBottom: '8px' }} />
                  <View style={{ height: '16px', background: '#e8e8e8', borderRadius: '4px', width: '60%' }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <View style={{ textAlign: 'center', padding: '60px 24px' }}>
            <Text style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>&#128722;</Text>
            <Text style={{ fontSize: '16px', color: '#999', display: 'block', marginBottom: '4px' }}>No products found</Text>
            <Text style={{ fontSize: '13px', color: '#bbb' }}>Try a different search or category</Text>
          </View>
        )}

        {/* Product cards */}
        <View style={{ display: 'flex', flexWrap: 'wrap' as const }}>
          {products.map((p: any) => (
            <View
              key={p.id}
              onClick={() => Taro.navigateTo({ url: `/pages/product/index?id=${p.id}` })}
              style={{ width: '45%', margin: '2.5%', background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
            >
              <Image
                src={p.images?.[0] || 'https://placehold.co/200x200?text=No+Image'}
                mode='aspectFill'
                style={{ width: '100%', height: '150px' }}
              />
              <View style={{ padding: '8px' }}>
                <Text style={{ fontSize: '13px', color: '#333', display: 'block', marginBottom: '4px' }}
                  numberOfLines={2}>{p.name}</Text>
                <Text style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '4px' }}>{p.merchant?.name}</Text>
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
                    ¥{(Number(p.basePrice) / 100).toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: '11px', color: '#bbb' }}>&#62;</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {loading && products.length > 0 && (
          <View style={{ textAlign: 'center', padding: '16px' }}>
            <Text style={{ color: '#999' }}>Loading more...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
