import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useToast } from '../../hooks/useToast'

export default function ProductPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  const navigate = useNavigate()
  const { showToast } = useToast()
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
      .then((p) => {
        setProduct(p)
        if (p.variants?.length) setSelectedVariant(p.variants[0])
      })
      .catch(() => navigate(-1))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const addToCart = async () => {
    if (!selectedVariant) {
      showToast('Select a variant', 'error')
      return
    }
    setAdding(true)
    try {
      await api.addToCart({ productId: product.id, variantId: selectedVariant.id, quantity: qty })
      showToast('Added to cart', 'success')
    } catch (err: any) {
      showToast(err || 'Failed', 'error')
    } finally {
      setAdding(false)
    }
  }

  const buyNow = async () => {
    await addToCart()
    navigate('/cart')
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>
  if (!product) return null

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      <div style={{ overflowY: 'auto', paddingBottom: '20px' }}>
        <img
          src={product.images?.[0] || 'https://placehold.co/400x300?text=No+Image'}
          alt={product.name}
          style={{ width: '100%', height: '280px', objectFit: 'cover' }}
        />

        <div style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1677ff' }}>
            ¥{(Number(selectedVariant?.price ?? product.basePrice) / 100).toFixed(2)}
          </div>
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '16px', color: '#333', fontWeight: 500 }}>{product.name}</div>
          </div>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '13px', color: '#999' }}>{product.merchant?.name}</div>
          </div>
          {parseFloat(product.coinOffsetRate ?? '0') > 0 && (
            <div style={{ marginTop: '8px', background: '#e6f4ff', borderRadius: '6px', padding: '6px 10px', display: 'inline-block' }}>
              <div style={{ fontSize: '12px', color: '#1677ff' }}>
                Up to {Math.round(parseFloat(product.coinOffsetRate) * 100)}% can be paid with HealthCoin
              </div>
            </div>
          )}
        </div>

        {/* Variants */}
        {product.variants?.length > 1 && (
          <div style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>Options</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {product.variants.map((v: any) => (
                <div
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: `1px solid ${selectedVariant?.id === v.id ? '#1677ff' : '#d9d9d9'}`,
                    color: selectedVariant?.id === v.id ? '#1677ff' : '#333', fontSize: '13px',
                    background: selectedVariant?.id === v.id ? '#e6f4ff' : '#fff', cursor: 'pointer',
                  }}
                >
                  {v.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Qty */}
        <div style={{ background: '#fff', padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '14px', color: '#333' }}>Quantity</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span onClick={() => setQty(Math.max(1, qty - 1))} style={{ fontSize: '20px', padding: '0 8px', color: '#666', cursor: 'pointer' }}>-</span>
            <span style={{ fontSize: '16px', minWidth: '24px', textAlign: 'center' }}>{qty}</span>
            <span onClick={() => setQty(qty + 1)} style={{ fontSize: '20px', padding: '0 8px', color: '#1677ff', cursor: 'pointer' }}>+</span>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div style={{ background: '#fff', padding: '16px', marginBottom: '10px' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>Description</div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: 1.6 }}>{product.description}</div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', bottom: '60px', left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', gap: '12px', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
        <button
          onClick={addToCart}
          disabled={adding}
          style={{ flex: 1, background: '#fff7e6', color: '#fa8c16', border: '1px solid #ffd591', borderRadius: '8px', padding: '10px', fontSize: '14px' }}
        >
          {adding ? 'Adding...' : 'Add to Cart'}
        </button>
        <button
          onClick={buyNow}
          style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '14px' }}
        >
          Buy Now
        </button>
      </div>
    </div>
  )
}
