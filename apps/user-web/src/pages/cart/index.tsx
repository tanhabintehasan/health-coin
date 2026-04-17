import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { usePageVisible } from '../../hooks/usePageVisible'
import { useToast } from '../../hooks/useToast'

export default function CartPage() {
  const [cart, setCart] = useState<any>({ merchants: [], items: [] })
  const [, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const navigate = useNavigate()
  const { showToast } = useToast()

  const fetchCart = async () => {
    setLoading(true)
    try {
      const res = await api.getCart()
      setCart(res)
    } catch {}
    finally { setLoading(false) }
  }

  usePageVisible(() => { fetchCart() })

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const removeItem = async (productId: string, variantId: string) => {
    await api.removeFromCart(productId, variantId)
    fetchCart()
  }

  const totalSelected = cart.items
    ?.filter((i: any) => selected.has(`${i.productId}:${i.variantId}`))
    .reduce((sum: number, i: any) => sum + Number(i.subtotal), 0) ?? 0

  const checkout = () => {
    const selectedItems = cart.items?.filter((i: any) => selected.has(`${i.productId}:${i.variantId}`))
    if (!selectedItems?.length) {
      showToast('Select items first', 'error')
      return
    }
    navigate(`/orders?items=${encodeURIComponent(JSON.stringify(selectedItems))}`)
  }

  if (!cart.merchants?.length) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontSize: '16px', color: '#999' }}>Your cart is empty</div>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: '24px', background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontSize: '14px' }}
        >
          Browse Products
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      {cart.merchants?.map((group: any) => (
        <div key={group.merchant?.id} style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontWeight: 500, color: '#333' }}>🏪 {group.merchant?.name}</div>
          </div>
          {group.items?.map((item: any) => {
            const key = `${item.productId}:${item.variantId}`
            return (
              <div key={key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f8f8f8' }}>
                <div
                  onClick={() => toggleSelect(key)}
                  style={{
                    width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected.has(key) ? '#1677ff' : '#d9d9d9'}`,
                    background: selected.has(key) ? '#1677ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  {selected.has(key) && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
                </div>
                <img src={item.product?.images?.[0] || 'https://placehold.co/80x80'} alt="" style={{ width: '64px', height: '64px', borderRadius: '6px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#333' }}>{item.product?.name}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>{item.variantName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
                      ¥{(Number(item.subtotal) / 100).toFixed(2)}
                    </div>
                    <div style={{ color: '#ff4d4f', fontSize: '12px', cursor: 'pointer' }} onClick={() => removeItem(item.productId, item.variantId)}>Remove</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <div style={{
        position: 'fixed', bottom: '60px', left: 0, right: 0, background: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>¥{(totalSelected / 100).toFixed(2)}</div>
        <button onClick={checkout} style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '10px 32px', fontSize: '14px' }}>
          Checkout ({selected.size})
        </button>
      </div>
    </div>
  )
}
