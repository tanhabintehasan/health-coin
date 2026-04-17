import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useUserStore } from '../../store/user.store'
import { useToast } from '../../hooks/useToast'

export default function AuthPage() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const setAuth = useUserStore((s) => s.setAuth)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { showToast } = useToast()
  const referralCode = searchParams.get('ref') || ''

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer)
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const sendOtp = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      showToast('Invalid phone number', 'error')
      return
    }
    setLoading(true)
    try {
      await api.sendOtp(phone)
      setStep('otp')
      setCountdown(60)
      showToast('OTP sent', 'success')
    } catch (err: any) {
      showToast(err || 'Failed to send OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    if (code.length !== 6) {
      showToast('Enter 6-digit OTP', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await api.verifyOtp(phone, code, referralCode || undefined)
      setAuth(res.user, res.accessToken, res.refreshToken)
      navigate('/')
    } catch (err: any) {
      showToast(err || 'Invalid OTP', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px 24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1677ff' }}>HealthCoin</div>
        <div style={{ color: '#999', fontSize: '14px', marginTop: '4px' }}>Health & Wellness Platform</div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>Phone Number</div>
          <input
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={step === 'otp'}
            style={{
              width: '100%',
              border: '1px solid #d9d9d9',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '16px',
              outline: 'none',
            }}
          />
        </div>

        {step === 'otp' && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>OTP Code</div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit OTP"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {step === 'phone' ? (
          <button
            onClick={sendOtp}
            disabled={loading}
            style={{
              width: '100%',
              background: '#1677ff',
              color: '#fff',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '16px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Sending...' : 'Send OTP'}
          </button>
        ) : (
          <div>
            <button
              onClick={verifyOtp}
              disabled={loading}
              style={{
                width: '100%',
                background: '#1677ff',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                marginBottom: '12px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              onClick={sendOtp}
              disabled={countdown > 0 || loading}
              style={{
                width: '100%',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '16px',
                background: '#fff',
                border: '1px solid #d9d9d9',
                color: countdown > 0 ? '#999' : '#333',
              }}
            >
              {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
