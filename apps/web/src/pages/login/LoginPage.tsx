import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Space, Divider, message, Alert, Tag } from 'antd'
import { LockOutlined, MobileOutlined, SafetyOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/auth.store'
import { api } from '../../services/api'

const { Title, Text } = Typography

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setAuth = useAuthStore((s) => s.setAuth)
  const detectRole = useAuthStore((s) => s.detectRole)
  const navigate = useNavigate()
  const location = useLocation()
  const [form] = Form.useForm()

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setCountdown(60)
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handleDemo = (role: 'admin' | 'merchant' | 'user') => {
    const map: Record<string, any> = {
      admin: { id: 'demo-admin-1', phone: '01700000001', nickname: 'Demo Admin', role: 'admin' },
      merchant: { id: 'demo-merchant-1', phone: '01700000002', nickname: 'Demo Merchant', role: 'merchant' },
      user: { id: 'demo-user-1', phone: '01700000003', nickname: 'Demo User', role: 'user' },
    }
    const demo = map[role]
    setAuth(demo, `demo-${role}-token`, role)
    localStorage.setItem('demoMode', 'true')
    localStorage.setItem('demoRole', role)
    message.success(`Logged in as Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`)
    const redirect = (location.state as any)?.from
    if (redirect && redirect.startsWith(`/portal/${role}`)) {
      navigate(redirect)
    } else {
      navigate(`/portal/${role}`)
    }
  }

  const sendOtp = async () => {
    try {
      await form.validateFields(['phone'])
    } catch {
      return
    }
    const phoneVal = form.getFieldValue('phone')
    setLoading(true)
    try {
      await api.sendOtp(phoneVal)
      setPhone(phoneVal)
      setStep('otp')
      startCountdown()
      message.success('OTP sent — check the API terminal for the code')
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const resendOtp = async () => {
    setLoading(true)
    try {
      await api.sendOtp(phone)
      startCountdown()
      message.success('New OTP sent — check the API terminal')
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    try {
      await form.validateFields(['code'])
    } catch {
      return
    }
    const code = form.getFieldValue('code')
    setLoading(true)
    try {
      const res: any = await api.verifyOtp(phone, code)
      setAuth(res.user, res.accessToken)
      localStorage.removeItem('demoMode')
      localStorage.removeItem('demoRole')
      message.success('Welcome! Detecting your role...')
      const role = await detectRole()
      const redirect = (location.state as any)?.from
      if (redirect && role && redirect.startsWith(`/portal/${role}`)) {
        navigate(redirect)
      } else {
        navigate(role ? `/portal/${role}` : '/')
      }
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const backToPhoneStep = () => {
    setStep('phone')
    setPhone('')
    form.resetFields(['code'])
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setCountdown(0)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 460, boxShadow: '0 2px 16px rgba(0,0,0,.1)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0 }}>HealthCoin</Title>
          <Text type="secondary">Unified Login</Text>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Demo access enabled for staging"
          description="Choose a demo role below to explore the platform instantly, or use the real OTP flow."
        />

        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Button type="primary" block size="large" icon={<SafetyOutlined />} onClick={() => handleDemo('admin')}>
            Demo Admin Login <Tag color="blue" style={{ marginLeft: 8 }}>Staging</Tag>
          </Button>
          <Button block size="large" icon={<ShopOutlined />} onClick={() => handleDemo('merchant')}>
            Demo Merchant Login <Tag color="green" style={{ marginLeft: 8 }}>Staging</Tag>
          </Button>
          <Button block size="large" icon={<UserOutlined />} onClick={() => handleDemo('user')}>
            Demo User Login <Tag color="orange" style={{ marginLeft: 8 }}>Staging</Tag>
          </Button>
        </Space>

        <Divider>Or continue with OTP</Divider>

        <Form form={form} layout="vertical">
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Enter phone number' },
              { pattern: /^1[3-9]\d{9}$/, message: 'Invalid phone number' },
            ]}
          >
            <Input prefix={<MobileOutlined />} placeholder="13x xxxx xxxx" size="large" maxLength={11} disabled={step === 'otp'} />
          </Form.Item>

          {step === 'otp' && (
            <Form.Item name="code" label="OTP Code" rules={[{ required: true, message: 'Enter the OTP' }, { len: 6, message: '6 digits required' }]}>
              <Input prefix={<LockOutlined />} placeholder="6-digit code" size="large" maxLength={6} />
            </Form.Item>
          )}

          {step === 'phone' ? (
            <Button type="default" block size="large" onClick={sendOtp} loading={loading}>Send OTP</Button>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block size="large" onClick={verifyOtp} loading={loading}>Verify & Login</Button>
              <Button block size="large" onClick={resendOtp} disabled={countdown > 0} loading={loading}>
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </Button>
              <Button block type="link" onClick={backToPhoneStep}>← Change phone number</Button>
            </Space>
          )}
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text type="secondary">Unified app for Admin · Merchant · User</Text>
        </div>
      </Card>
    </div>
  )
}
