import { useState } from 'react'
import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { api } from '../../services/api'

export default function ReferralPage() {
  const [referral, setReferral] = useState<any>(null)
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ref, list] = await Promise.all([
        api.getMyReferral(),
        api.getMyReferrals(),
      ])
      setReferral(ref)
      setReferrals(list ?? [])
    } catch {} finally { setLoading(false) }
  }

  useDidShow(() => { fetchData() })

  const copyCode = () => {
    if (!referral?.referralCode) return
    Taro.setClipboardData({ data: referral.referralCode })
    Taro.showToast({ title: 'Code copied!', icon: 'success' })
  }

  const shareLink = () => {
    Taro.showShareMenu({ withShareTicket: true })
  }

  const level1 = referrals.filter((r: any) => r.level === 1)
  const level2 = referrals.filter((r: any) => r.level === 2)

  if (loading) {
    return (
      <View style={{ padding: 40, textAlign: 'center' }}>
        <Text style={{ color: '#999' }}>Loading...</Text>
      </View>
    )
  }

  return (
    <View style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <View style={{ background: 'linear-gradient(135deg, #1677ff, #722ed1)', padding: '24px 16px', textAlign: 'center' }}>
        <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', display: 'block', marginBottom: '8px' }}>
          Refer & Earn
        </Text>
        <Text style={{ fontSize: '13px', color: 'rgba(255,255,255,.8)' }}>
          Earn HealthCoins for every friend you refer
        </Text>
      </View>

      {/* QR Code */}
      {referral?.qrCodeBase64 && (
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <Image
            src={referral.qrCodeBase64}
            style={{ width: '160px', height: '160px', margin: '0 auto', display: 'block' }}
          />
          <Text style={{ fontSize: '12px', color: '#999', marginTop: '8px', display: 'block' }}>
            Scan to join with your referral link
          </Text>
        </View>
      )}

      {/* Referral code */}
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <Text style={{ fontSize: '14px', color: '#999', display: 'block', marginBottom: '8px', textAlign: 'center' }}>
          Your Referral Code
        </Text>
        <View style={{ background: '#f6f8ff', borderRadius: '8px', padding: '16px', textAlign: 'center', marginBottom: '12px' }}>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#1677ff', letterSpacing: '4px' }}>
            {referral?.referralCode ?? '------'}
          </Text>
        </View>
        <View style={{ display: 'flex', gap: '10px' }}>
          <Button onClick={copyCode}
            style={{ flex: 1, background: '#f0f5ff', color: '#1677ff', border: '1px solid #adc6ff', borderRadius: '8px', fontSize: '14px' }}>
            Copy Code
          </Button>
          <Button onClick={shareLink}
            style={{ flex: 1, background: '#1677ff', color: '#fff', borderRadius: '8px', fontSize: '14px' }}>
            Share
          </Button>
        </View>
      </View>

      {/* Stats */}
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '16px', display: 'block' }}>My Network</Text>
        <View style={{ display: 'flex' }}>
          <View style={{ flex: 1, textAlign: 'center' }}>
            <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#1677ff', display: 'block' }}>{level1.length}</Text>
            <Text style={{ fontSize: '12px', color: '#999' }}>Direct Referrals (L1)</Text>
          </View>
          <View style={{ width: '1px', background: '#f0f0f0' }} />
          <View style={{ flex: 1, textAlign: 'center' }}>
            <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#722ed1', display: 'block' }}>{level2.length}</Text>
            <Text style={{ fontSize: '12px', color: '#999' }}>Indirect (L2)</Text>
          </View>
        </View>
      </View>

      {/* Referral list */}
      {referrals.length > 0 && (
        <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', overflow: 'hidden' }}>
          <Text style={{ fontSize: '14px', fontWeight: '500', padding: '12px 16px', display: 'block', borderBottom: '1px solid #f0f0f0' }}>
            Referral List
          </Text>
          {referrals.map((r: any, idx: number) => (
            <View
              key={r.id}
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: idx < referrals.length - 1 ? '1px solid #f8f8f8' : 'none',
              }}
            >
              <View style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <View style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: r.level === 1 ? '#e6f4ff' : '#f9f0ff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: '14px', color: r.level === 1 ? '#1677ff' : '#722ed1', fontWeight: 'bold' }}>
                    L{r.level}
                  </Text>
                </View>
                <Text style={{ fontSize: '14px', color: '#333' }}>{r.maskedPhone}</Text>
              </View>
              <Text style={{ fontSize: '12px', color: '#bbb' }}>{r.joinedAt?.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* How it works */}
      <View style={{ background: '#fff', margin: '12px', borderRadius: '10px', padding: '16px' }}>
        <Text style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', display: 'block' }}>How It Works</Text>
        {[
          { step: '1', text: 'Share your referral code with friends' },
          { step: '2', text: 'Friend registers using your code' },
          { step: '3', text: 'Earn coins when they make purchases' },
          { step: '4', text: 'Earn from their referrals too (Level 2)' },
        ].map((item) => (
          <View key={item.step} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <View style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>{item.step}</Text>
            </View>
            <Text style={{ fontSize: '13px', color: '#666', flex: 1, lineHeight: '1.5' }}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
