import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { message, Spin, Empty, Button, Card, Typography } from 'antd'
import { DeleteOutlined, ShoppingOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

export default function CartPage() {
  const [cart, setCart] = useState<any>({ merchants: [], items: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const navigate = useNavigate()

  const fetchCart = async () => {
    setLoading(true)
    try {
      const res = await api.getCart()
      setCart(res)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCart() }, [])

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const toggleMerchant = (_merchantId: string, items: any[]) => {
    const keys = items.map((i: any) => `${i.productId}:${i.variantId}`)
    const allSelected = keys.every((k) => selected.has(k))
    setSelected((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => {
        if (allSelected) next.delete(k)
        else next.add(k)
      })
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

  const selectedItems = cart.items?.filter((i: any) => selected.has(`${i.productId}:${i.variantId}`))

  const checkout = () => {
    if (!selectedItems?.length) { message.error('请先选择商品'); return }
    navigate(`/portal/user/orders?items=${encodeURIComponent(JSON.stringify(selectedItems))}`)
  }

  if (loading && !cart.items?.length) return <div style={{ padding: 80, textAlign: 'center' }}><Spin size="large" /></div>

  if (!cart.merchants?.length) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <Empty description="购物车空空如也" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        <Button type="primary" style={{ marginTop: 24 }} onClick={() => navigate('/portal/user/home')} icon={<ShoppingOutlined />}>去逛逛</Button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100%', paddingBottom: 100, background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ margin: 0 }}>购物车 ({cart.items?.length || 0})</Title>
      </div>

      {cart.merchants?.map((group: any) => {
        const items = group.items || []
        const keys = items.map((i: any) => `${i.productId}:${i.variantId}`)
        const allSelected = keys.length > 0 && keys.every((k: string) => selected.has(k))
        return (
          <Card key={group.merchant?.id || 'platform'} style={{ margin: 12, borderRadius: 12 }} bodyStyle={{ padding: 12 }}>
            <div style={{ padding: '0 0 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                onClick={() => toggleMerchant(group.merchant?.id || 'platform', items)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${allSelected ? '#1677ff' : '#d9d9d9'}`,
                  background: allSelected ? '#1677ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                }}
              >{allSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}</div>
              <Text strong>{group.merchant?.name || '平台自营'}</Text>
            </div>
            {items.map((item: any) => {
              const key = `${item.productId}:${item.variantId}`
              const isSelected = selected.has(key)
              return (
                <div key={key} style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #f8f8f8' }}>
                  <div
                    onClick={() => toggleSelect(key)}
                    style={{
                      width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isSelected ? '#1677ff' : '#d9d9d9'}`,
                      background: isSelected ? '#1677ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}
                  >{isSelected && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}</div>
                  <img src={item.product?.images?.[0] || 'https://placehold.co/80x80'} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{item.variantName} x{item.quantity}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 15, fontWeight: 'bold', color: '#f5222d' }}>¥{(Number(item.subtotal) / 100).toFixed(2)}</div>
                      <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeItem(item.productId, item.variantId)}>删除</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        )
      })}

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)', zIndex: 40 }}>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f5222d' }}>¥{(totalSelected / 100).toFixed(2)}</div>
        <Button type="primary" size="large" onClick={checkout} disabled={selectedItems?.length === 0}>
          去结算 ({selected.size})
        </Button>
      </div>
    </div>
  )
}
