import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Button, Typography, Space, message } from 'antd'
import { ShopOutlined } from '@ant-design/icons'
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
  const [form] = Form.useForm()

  const startCountdown = () => {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const sendOtp = async () => {
    const values = await form.validateFields(['phone'])
    setPhone(values.phone)
    setLoading(true)
    try {
      await api.sendOtp(values.phone)
      setStep('otp')
      startCountdown()
      message.success('OTP sent')
    } catch (err: any) {
      message.error(err || 'Failed to send OTP')
    } finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    const values = await form.validateFields()
    setLoading(true)
    try {
      const res: any = await api.verifyOtp(values.phone, values.code)
      setAuth(res.user, res.accessToken)
      message.success('Welcome back!')
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err || 'Invalid OTP')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 400, borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Space direction="vertical" size={4}>
            <ShopOutlined style={{ fontSize: 40, color: '#1677ff' }} />
            <Title level={3} style={{ margin: 0, color: '#1677ff' }}>Merchant Portal</Title>
            <Text type="secondary">HealthCoin Platform</Text>
          </Space>
        </div>

        <Form form={form} layout="vertical">
          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[
              { required: true, message: 'Enter your phone number' },
              { pattern: /^1[3-9]\d{9}$/, message: 'Invalid Chinese phone number' },
            ]}
          >
            <Input placeholder="13x xxxx xxxx" maxLength={11} disabled={step === 'otp'} size="large" />
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
              <Input placeholder="6-digit OTP" maxLength={6} size="large" />
            </Form.Item>
          )}

          {step === 'phone' ? (
            <Button type="primary" block size="large" onClick={sendOtp} loading={loading}>
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
            </Space>
          )}
        </Form>
      </Card>
    </div>
  )
}
