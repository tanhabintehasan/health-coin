import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Space, Divider, message, Alert } from 'antd'
import { LockOutlined, SafetyOutlined, MobileOutlined } from '@ant-design/icons'
import { useAuthStore } from '../../store/auth.store'
import client from '../../api/client'

const { Title, Text } = Typography

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
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

  const handleDemoAdminLogin = () => {
    const demoAdminUser = {
      id: 'demo-admin-1',
      phone: '01700000001',
      nickname: 'Demo Admin',
      role: 'admin',
      userType: 'admin',
      isActive: true,
    }

    setAuth(demoAdminUser as any, 'demo-admin-token')
    localStorage.setItem('demoMode', 'true')
    localStorage.setItem('demoRole', 'admin')

    message.success('Logged in as Demo Admin')
    navigate('/admin/dashboard')
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
      await client.post('/auth/otp/send', { phone: phoneVal })
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
      await client.post('/auth/otp/send', { phone })
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
      const res: any = await client.post('/auth/otp/verify', { phone, code })
      setAuth(res.user, res.accessToken)
      localStorage.removeItem('demoMode')
      localStorage.removeItem('demoRole')
      message.success('Welcome!')
      navigate('/admin/dashboard')
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 430,
          boxShadow: '0 2px 16px rgba(0,0,0,.1)',
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <SafetyOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 8 }} />
          <Title level={3} style={{ margin: 0 }}>
            HealthCoin Admin
          </Title>
          <Text type="secondary">Platform Management</Text>
        </div>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
          message="Demo admin access enabled"
          description="Use Demo Admin Login for client presentation, or continue with OTP login."
        />

        <Button
          type="primary"
          size="large"
          block
          icon={<SafetyOutlined />}
          onClick={handleDemoAdminLogin}
          style={{ marginBottom: 16 }}
        >
          Demo Admin Login
        </Button>

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
            <Input
              prefix={<MobileOutlined />}
              placeholder="13x xxxx xxxx"
              size="large"
              maxLength={11}
              disabled={step === 'otp'}
            />
          </Form.Item>

          {step === 'otp' && (
            <Form.Item
              name="code"
              label="OTP Code"
              rules={[
                { required: true, message: 'Enter the OTP' },
                { len: 6, message: '6 digits required' },
              ]}
            >
              <Input
                prefix={<LockOutlined />}
                placeholder="6-digit code"
                size="large"
                maxLength={6}
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
                size="large"
                onClick={resendOtp}
                disabled={countdown > 0}
                loading={loading}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </Button>

              <Button block type="link" onClick={backToPhoneStep}>
                ← Change phone number
              </Button>
            </Space>
          )}
        </Form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <Text type="secondary">Demo Admin: click button directly</Text>
        </div>
      </Card>
    </div>
  )
}
