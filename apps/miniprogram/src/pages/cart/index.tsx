import { useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api } from '../../services/api'

export default function CartPage() {
  const [cart, setCart] = useState<any>({ merchants: [], items: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const fetchCart = async () => {
    setLoading(true)
    try {
      const res = await api.getCart()
      setCart(res)
    } catch {} finally { setLoading(false) }
  }

  useDidShow(() => { fetchCart() })

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
    if (!selectedItems?.length) { Taro.showToast({ title: 'Select items first', icon: 'error' }); return }
    Taro.navigateTo({ url: `/pages/order/index?items=${encodeURIComponent(JSON.stringify(selectedItems))}` })
  }

  if (!cart.merchants?.length) {
    return (
      <View style={{ textAlign: 'center', padding: '60px 24px' }}>
        <Text style={{ fontSize: '16px', color: '#999' }}>Your cart is empty</Text>
        <Button onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
          style={{ marginTop: '24px', background: '#1677ff', color: '#fff', borderRadius: '8px' }}>
          Browse Products
        </Button>
      </View>
    )
  }

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: '80px' }}>
      {cart.merchants?.map((group: any) => (
        <View key={group.merchant?.id} style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
          <View style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Text style={{ fontWeight: '500', color: '#333' }}>🏪 {group.merchant?.name}</Text>
          </View>
          {group.items?.map((item: any) => {
            const key = `${item.productId}:${item.variantId}`
            return (
              <View key={key} style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f8f8f8' }}>
                <View onClick={() => toggleSelect(key)}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected.has(key) ? '#1677ff' : '#d9d9d9'}`, background: selected.has(key) ? '#1677ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected.has(key) && <Text style={{ color: '#fff', fontSize: '12px' }}>✓</Text>}
                </View>
                <Image src={item.product?.images?.[0] || 'https://placehold.co/80x80'} style={{ width: '64px', height: '64px', borderRadius: '6px' }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '13px', color: '#333' }}>{item.product?.name}</Text>
                  <View><Text style={{ fontSize: '12px', color: '#999' }}>{item.variantName}</Text></View>
                  <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <Text style={{ fontSize: '15px', fontWeight: 'bold', color: '#1677ff' }}>
                      ¥{(Number(item.subtotal) / 100).toFixed(2)}
                    </Text>
                    <Text style={{ color: '#ff4d4f', fontSize: '12px' }} onClick={() => removeItem(item.productId, item.variantId)}>Remove</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>
      ))}

      <View style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 -2px 8px rgba(0,0,0,.08)' }}>
        <Text style={{ fontSize: '16px', fontWeight: 'bold' }}>¥{(totalSelected / 100).toFixed(2)}</Text>
        <Button onClick={checkout} style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', padding: '0 32px' }}>
          Checkout ({selected.size})
        </Button>
      </View>
    </View>
  )
}
