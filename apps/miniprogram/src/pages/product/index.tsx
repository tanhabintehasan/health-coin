import { useState, useEffect } from 'react'
import { View, Text, Image, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { api } from '../../services/api'

export default function ProductPage() {
  const router = useRouter()
  const { id } = router.params
  const [product, setProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getProduct(id).then((p) => {
      setProduct(p)
      if (p.variants?.length) setSelectedVariant(p.variants[0])
    }).catch(() => Taro.navigateBack())
    .finally(() => setLoading(false))
  }, [id])

  const addToCart = async () => {
    if (!selectedVariant) { Taro.showToast({ title: 'Select a variant', icon: 'error' }); return }
    setAdding(true)
    try {
      await api.addToCart({ productId: product.id, variantId: selectedVariant.id, quantity: qty })
      Taro.showToast({ title: 'Added to cart', icon: 'success' })
    } catch (err: any) {
      Taro.showToast({ title: err || 'Failed', icon: 'error' })
    } finally { setAdding(false) }
  }

  const buyNow = async () => {
    await addToCart()
    Taro.switchTab({ url: '/pages/cart/index' })
  }

  if (loading) return <View style={{ padding: 40, textAlign: 'center' }}><Text>Loading...</Text></View>
  if (!product) return null

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      <ScrollView scrollY>
        <Image src={product.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} mode='aspectFill'
          style={{ width: '100%', height: '280px' }} />

        <View style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
          <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#1677ff' }}>
            ¥{(Number(selectedVariant?.price ?? product.basePrice) / 100).toFixed(2)}
          </Text>
          <View style={{ marginTop: '8px' }}>
            <Text style={{ fontSize: '16px', color: '#333', fontWeight: '500' }}>{product.name}</Text>
          </View>
          <View style={{ marginTop: '4px' }}>
            <Text style={{ fontSize: '13px', color: '#999' }}>{product.merchant?.name}</Text>
          </View>
          {parseFloat(product.coinOffsetRate ?? '0') > 0 && (
            <View style={{ marginTop: '8px', background: '#e6f4ff', borderRadius: '6px', padding: '6px 10px', display: 'inline-flex' }}>
              <Text style={{ fontSize: '12px', color: '#1677ff' }}>
                Up to {Math.round(parseFloat(product.coinOffsetRate) * 100)}% can be paid with HealthCoin
              </Text>
            </View>
          )}
        </View>

        {/* Variants */}
        {product.variants?.length > 1 && (
          <View style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
            <Text style={{ fontSize: '14px', color: '#666', marginBottom: '12px', display: 'block' }}>Options</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {product.variants.map((v: any) => (
                <View
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: `1px solid ${selectedVariant?.id === v.id ? '#1677ff' : '#d9d9d9'}`,
                    color: selectedVariant?.id === v.id ? '#1677ff' : '#333', fontSize: '13px',
                    background: selectedVariant?.id === v.id ? '#e6f4ff' : '#fff',
                  }}
                >
                  <Text>{v.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Qty */}
        <View style={{ background: '#fff', padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: '14px', color: '#333' }}>Quantity</Text>
          <View style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Text onClick={() => setQty(Math.max(1, qty - 1))} style={{ fontSize: '20px', padding: '0 8px', color: '#666' }}>-</Text>
            <Text style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>{qty}</Text>
            <Text onClick={() => setQty(qty + 1)} style={{ fontSize: '20px', padding: '0 8px', color: '#1677ff' }}>+</Text>
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <View style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px', display: 'block' }}>Description</Text>
            <Text style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>{product.description}</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: '12px', boxShadow: '0 -2px 8px rgba(0,0,0,.08)' }}>
        <Button onClick={addToCart} loading={adding}
          style={{ flex: 1, background: '#fff7e6', color: '#fa8c16', border: '1px solid #ffd591', borderRadius: '8px' }}>
          Add to Cart
        </Button>
        <Button onClick={buyNow}
          style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: '8px' }}>
          Buy Now
        </Button>
      </View>
    </View>
  )
}
