import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { api } from '../../services/api'
import { useUserStore } from '../../store/user.store'

export default function AuthPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const setAuth = useUserStore((s) => s.setAuth)

  // Capture referral code from launch params
  const [referralCode, setReferralCode] = useState('')
  useLoad((options) => {
    if (options.ref) setReferralCode(options.ref)
  })

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 })
    }, 1000)
  }

  const sendOtp = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) { Taro.showToast({ title: 'Invalid phone number', icon: 'error' }); return }
    setLoading(true)
    try {
      await api.sendOtp(phone)
      setStep('otp')
      startCountdown()
      Taro.showToast({ title: 'OTP sent', icon: 'success' })
    } catch (err: any) {
      Taro.showToast({ title: err || 'Failed to send OTP', icon: 'error' })
    } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    if (code.length !== 6) { Taro.showToast({ title: 'Enter 6-digit OTP', icon: 'error' }); return }
    setLoading(true)
    try {
      const res = await api.verifyOtp(phone, code, referralCode)
      setAuth(res.user, res.accessToken)
      Taro.switchTab({ url: '/pages/home/index' })
    } catch (err: any) {
      Taro.showToast({ title: err || 'Invalid OTP', icon: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <View style={{ padding: '40px 24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <View style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Text style={{ fontSize: '28px', fontWeight: 'bold', color: '#1677ff' }}>HealthCoin</Text>
        <View><Text style={{ color: '#999', fontSize: '14px' }}>Health & Wellness Platform</Text></View>
      </View>

      <View style={{ background: '#fff', borderRadius: '12px', padding: '24px' }}>
        <View style={{ marginBottom: '16px' }}>
          <Text style={{ fontSize: '14px', color: '#333', display: 'block', marginBottom: '8px' }}>Phone Number</Text>
          <Input
            type='number'
            placeholder='Enter your phone number'
            value={phone}
            onInput={(e) => setPhone(e.detail.value)}
            style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', fontSize: '16px' }}
            disabled={step === 'otp'}
          />
        </View>

        {step === 'otp' && (
          <View style={{ marginBottom: '16px' }}>
            <Text style={{ fontSize: '14px', color: '#333', display: 'block', marginBottom: '8px' }}>OTP Code</Text>
            <Input
              type='number'
              placeholder='6-digit OTP'
              value={code}
              onInput={(e) => setCode(e.detail.value)}
              maxlength={6}
              style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '12px', fontSize: '16px' }}
            />
          </View>
        )}

        {step === 'phone' ? (
          <Button
            onClick={sendOtp}
            loading={loading}
            style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', width: '100%', marginTop: '8px' }}
          >
            Send OTP
          </Button>
        ) : (
          <View>
            <Button
              onClick={verifyOtp}
              loading={loading}
              style={{ background: '#1677ff', color: '#fff', borderRadius: '8px', width: '100%', marginBottom: '12px' }}
            >
              Verify & Login
            </Button>
            <Button
              onClick={sendOtp}
              disabled={countdown > 0}
              style={{ borderRadius: '8px', width: '100%', background: '#fff', border: '1px solid #d9d9d9' }}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}
