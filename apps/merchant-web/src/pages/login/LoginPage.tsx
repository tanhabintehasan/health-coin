import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Space, message, Divider, Alert } from 'antd'
import { ShopOutlined, LockOutlined, MobileOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const { Title, Text } = Typography

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const handleDemoMerchantLogin = () => {
    const demoMerchantUser = {
      id: 'demo-merchant-1',
      phone: '01700000002',
      nickname: 'Demo Merchant',
      role: 'merchant',
      userType: 'merchant',
      isActive: true,
    }

    setAuth(demoMerchantUser as any, 'demo-merchant-token')
    localStorage.setItem('demoMode', 'true')
    localStorage.setItem('demoRole', 'merchant')

    message.success('Logged in as Demo Merchant')

    // Change this if your merchant dashboard route is different
    navigate('/merchant/dashboard')
  }

  const sendOtp = async () => {
    try {
      const values = await form.validateFields(['phone'])
      setPhone(values.phone)
      setLoading(true)

      await api.sendOtp(values.phone)
      setStep('otp')
      startCountdown()
      message.success('OTP sent')
    } catch (err: any) {
      message.error(err || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const res: any = await api.verifyOtp(values.phone, values.code)
      setAuth(res.user, res.accessToken)

      localStorage.removeItem('demoMode')
      localStorage.removeItem('demoRole')

      message.success('Welcome back!')

      // Change this if your merchant dashboard route is different
      navigate('/merchant/dashboard')
    } catch (err: any) {
      message.error(err || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const backToPhoneStep = () => {
    setStep('phone')
    form.resetFields(['code'])
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setCountdown(0)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f5ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Space direction="vertical" size={4}>
            <ShopOutlined style={{ fontSize: 40, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0, color: '#1677ff' }}>
              Merchant Portal
            </Title>
            <Text type="secondary">HealthCoin Platform</Text>
          </Space>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Demo access available"
          description="Use Demo Merchant Login for the client presentation, or continue with OTP login."
        />

        <Button
          type="primary"
          block
          size="large"
          onClick={handleDemoMerchantLogin}
          style={{ marginBottom: 16 }}
        >
          Demo Merchant Login
        </Button>

        <Divider style={{ margin: '16px 0' }}>Or login with OTP</Divider>

        <Form form={form} layout="vertical">
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Enter your phone number' },
              { pattern: /^1[3-9]\d{9}$/, message: 'Invalid Chinese phone number' },
            ]}
          >
            <Input
              prefix={<MobileOutlined />}
              placeholder="13x xxxx xxxx"
              maxLength={11}
              disabled={step === 'otp'}
              size="large"
            />
          </Form.Item>

          {step === 'otp' && (
            <Form.Item
              name="code"
              label="OTP Code"
              rules={[
                { required: true, message: 'Enter the 6-digit OTP' },
                { len: 6, message: 'OTP must be 6 digits' },
              ]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="6-digit OTP"
                maxLength={6}
                size="large"
              />
            </Form.Item>
          )}

          {step === 'phone' ? (
            <Button type="default" block size="large" onClick={sendOtp} loading={loading}>
              Send OTP
            </Button>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block size="large" onClick={verifyOtp} loading={loading}>
                Verify & Login
              </Button>

              <Button
                block
                onClick={sendOtp}
                disabled={countdown > 0}
                loading={loading && countdown === 0}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </Button>

              <Button type="link" block onClick={backToPhoneStep}>
                ← Change phone number
              </Button>
            </Space>
          )}
        </Form>
      </Card>
    </div>
  )
}
