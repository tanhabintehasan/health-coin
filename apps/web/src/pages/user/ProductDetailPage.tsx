import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin } from 'antd'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate(-1)
      return
    }
    api.getProduct(id)
      .then((p) => { setProduct(p); if ((p as any).variants?.length) setSelectedVariant((p as any).variants[0]) })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const addToCart = async () => {
    if (!selectedVariant) { message.error('Select a variant'); return }
    setAdding(true)
    try {
      await api.addToCart({ productId: product.id, variantId: selectedVariant.id, quantity: qty })
      message.success('Added to cart')
    } catch (err: any) { message.error(err || 'Failed') } finally { setAdding(false) }
  }

  const buyNow = async () => {
    await addToCart()
    navigate('/portal/user/cart')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
  if (!product) return null

  return (
    <div style={{ minHeight: '100%' }}>
      <div style={{ overflowY: 'auto', paddingBottom: 20 }}>
        <img src={product.images?.[0] || 'https://placehold.co/400x300?text=No+Image'} alt={product.name} style={{ width: '100%', height: 280, objectFit: 'cover' }} />
        <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#1677ff' }}>¥{(Number(selectedVariant?.price ?? product.basePrice) / 100).toFixed(2)}</div>
          <div style={{ marginTop: 8, fontSize: 16, color: '#333', fontWeight: 500 }}>{product.name}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#999' }}>{product.merchant?.name}</div>
          {parseFloat(product.coinOffsetRate ?? '0') > 0 && (
            <div style={{ marginTop: 8, background: '#e6f4ff', borderRadius: 6, padding: '6px 10px', display: 'inline-block' }}>
              <div style={{ fontSize: 12, color: '#1677ff' }}>Up to {Math.round(parseFloat(product.coinOffsetRate) * 100)}% can be paid with HealthCoin</div>
            </div>
          )}
        </div>

        {product.variants?.length > 1 && (
          <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Options</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {product.variants.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${selectedVariant?.id === v.id ? '#1677ff' : '#d9d9d9'}`, color: selectedVariant?.id === v.id ? '#1677ff' : '#333', fontSize: 13, background: selectedVariant?.id === v.id ? '#e6f4ff' : '#fff', cursor: 'pointer' }}
                >{v.name}</div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: '#fff', padding: 16, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, color: '#333' }}>Quantity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span onClick={() => setQty(Math.max(1, qty - 1))} style={{ fontSize: 20, padding: '0 8px', color: '#666', cursor: 'pointer' }}>-</span>
            <span style={{ fontSize: 16, minWidth: 24, textAlign: 'center' }}>{qty}</span>
            <span onClick={() => setQty(qty + 1)} style={{ fontSize: 20, padding: '0 8px', color: '#1677ff', cursor: 'pointer' }}>+</span>
          </div>
        </div>

        {product.description && (
          <div style={{ background: '#fff', padding: 16, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Description</div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6 }}>{product.description}</div>
          </div>
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: 12, boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
        <button onClick={addToCart} disabled={adding} style={{ flex: 1, background: '#fff7e6', color: '#fa8c16', border: '1px solid #ffd591', borderRadius: 8, padding: 10, fontSize: 14 }}>{adding ? 'Adding...' : 'Add to Cart'}</button>
        <button onClick={buyNow} style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: 8, padding: 10, fontSize: 14 }}>Buy Now</button>
      </div>
    </div>
  )
}
