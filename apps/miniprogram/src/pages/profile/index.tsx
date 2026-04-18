import { useState } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api } from '../../services/api'
import { useUserStore } from '../../store/user.store'

const TIER_COLOR: Record<string, string> = {
  BRONZE: '#cd7f32',
  SILVER: '#a8a9ad',
  GOLD: '#ffd700',
  PLATINUM: '#e5e4e2',
  DIAMOND: '#00bfff',
  CROWN: '#9400d3',
}

export default function ProfilePage() {
  const [membership, setMembership] = useState<any>(null)
  const { user, logout: clearAuth } = useUserStore()

  const fetchMembership = async () => {
    try {
      const res = await api.getMyMembership()
      setMembership(res)
    } catch {}
  }

  useDidShow(() => { fetchMembership() })

  const logout = () => {
    Taro.showModal({
      title: 'Logout',
      content: 'Are you sure you want to logout?',
      success: (res) => {
        if (res.confirm) {
          clearAuth()
          Taro.reLaunch({ url: '/pages/auth/index' })
        }
      },
    })
  }

  const tier = membership?.currentTier
  const tierColor = tier ? TIER_COLOR[tier.name] ?? '#1677ff' : '#1677ff'

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Profile header */}
      <View style={{ background: `linear-gradient(135deg, ${tierColor}, #1677ff)`, padding: '32px 20px 24px' }}>
        <View style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <View style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: '28px' }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', display: 'block' }}>
              {user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : 'User'}
            </Text>
            {tier && (
              <View style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,.2)', borderRadius: '12px', padding: '2px 10px', marginTop: '4px' }}>
                <Text style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>{tier.name}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Membership progress */}
      {membership && (
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
          <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text style={{ fontSize: '14px', fontWeight: '500', color: '#333' }}>Membership Level</Text>
            <Text style={{ fontSize: '14px', color: tierColor, fontWeight: 'bold' }}>{tier?.name ?? 'BRONZE'}</Text>
          </View>
          {membership.nextTier && (
            <>
              <View style={{ background: '#f0f0f0', borderRadius: '4px', height: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                <View style={{
                  height: '100%', borderRadius: '4px', background: tierColor,
                  width: `${membership.progressPercent ?? 0}%`,
                }} />
              </View>
              <Text style={{ fontSize: '12px', color: '#999' }}>
                {(Number(membership.coinsToNextTier ?? 0) / 100).toFixed(0)} HC to {membership.nextTier.name}
              </Text>
            </>
          )}
          {!membership.nextTier && (
            <Text style={{ fontSize: '12px', color: '#52c41a' }}>Maximum tier reached!</Text>
          )}
        </View>
      )}

      {/* Menu items */}
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
        {[
          { label: 'My Orders', iconBg: '#e6f4ff', iconColor: '#1677ff', iconChar: '\u{1F4E6}', path: '/pages/order/index' },
          { label: 'My Wallet', iconBg: '#f6ffed', iconColor: '#52c41a', iconChar: '\u{1F4B0}', path: '/pages/wallet/index' },
          { label: 'Referral', iconBg: '#f9f0ff', iconColor: '#722ed1', iconChar: '\u{1F465}', path: '/pages/referral/index' },
          { label: 'Health Records', iconBg: '#fff7e6', iconColor: '#fa8c16', iconChar: '\u{1F3E5}', path: '/pages/health/index' },
        ].map((item, idx, arr) => (
          <View
            key={item.label}
            onClick={() => Taro.navigateTo({ url: item.path })}
            style={{
              padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: idx < arr.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <View style={{
                width: '36px', height: '36px', borderRadius: '10px', background: item.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: '18px', color: item.iconColor }}>{item.iconChar}</Text>
              </View>
              <Text style={{ fontSize: '15px', color: '#333' }}>{item.label}</Text>
            </View>
            <Text style={{ color: '#bbb', fontSize: '16px' }}>›</Text>
          </View>
        ))}
      </View>

      {/* Settings section */}
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
        <View style={{ padding: '8px 16px 4px' }}>
          <Text style={{ fontSize: '12px', color: '#999', fontWeight: '500', letterSpacing: '0.5px' }}>SETTINGS</Text>
        </View>
        <View
          onClick={() => Taro.navigateTo({ url: '/pages/profile/info' })}
          style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <View style={{
              width: '36px', height: '36px', borderRadius: '10px', background: '#f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: '18px', color: '#666' }}>&#9998;</Text>
            </View>
            <Text style={{ fontSize: '15px', color: '#333' }}>Edit Profile</Text>
          </View>
          <Text style={{ color: '#bbb', fontSize: '16px' }}>›</Text>
        </View>
      </View>

      {/* Logout */}
      <View style={{ margin: '12px', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <Button
          onClick={logout}
          style={{
            background: '#fff', color: '#ff4d4f', border: '1.5px solid #ff4d4f',
            borderRadius: '10px', width: '100%', fontSize: '15px', fontWeight: '500',
          }}
        >
          Logout
        </Button>
      </View>
    </View>
  )
}
