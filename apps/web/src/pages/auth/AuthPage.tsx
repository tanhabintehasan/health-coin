import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Button, Input, Steps, Form, Typography, Space, Divider, message
} from 'antd'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const { Title, Text } = Typography

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') || ''
  const { setAuth, detectRole } = useAuthStore()

  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const sendOtp = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      message.error('请输入有效的手机号')
      return
    }
    try {
      await api.sendOtp(phone)
      message.success('验证码已发送')
      setCountdown(60)
      setStep(1)
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '发送失败，请稍后重试')
    }
  }

  const doRedirect = (role: 'admin' | 'merchant' | 'user') => {
    if (from && from.startsWith('/')) {
      navigate(from, { replace: true })
      return
    }
    if (role === 'admin') navigate('/portal/admin/dashboard', { replace: true })
    else if (role === 'merchant') navigate('/portal/merchant/dashboard', { replace: true })
    else navigate('/portal/user/home', { replace: true })
  }

  const verifyAndLogin = async () => {
    if (!/^\d{6}$/.test(otp)) {
      message.error('请输入6位验证码')
      return
    }
    setLoading(true)
    try {
      const res: any = await api.verifyOtp(phone, otp, referralCode || undefined)
      if (!res?.accessToken) throw new Error('登录失败')
      setAuth(res.user, res.accessToken)
      const role = await detectRole()
      doRedirect(role as any)
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = async (role: 'admin' | 'merchant' | 'user') => {
    const demoPhones: Record<string, string> = {
      admin: '13800000001',
      merchant: '13800000002',
      user: '13800000003',
    }
    const p = demoPhones[role]
    try {
      await api.sendOtp(p)
      const res: any = await api.verifyOtp(p, '123456')
      setAuth(res.user, res.accessToken)
      doRedirect(role)
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '演示登录失败')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1677ff 0%,#0958d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: 420, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>HealthCoin</Title>
          <Text type="secondary">健康币平台 · 登录 / 注册</Text>
        </div>

        <Steps current={step} items={[{ title: '手机号' }, { title: '验证码' }]} style={{ marginBottom: 24 }} />

        {step === 0 && (
          <Form layout="vertical">
            <Form.Item label="手机号">
              <Input placeholder="请输入手机号" size="large" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Form.Item>
            <Button type="primary" size="large" block onClick={sendOtp}>获取验证码</Button>
          </Form>
        )}

        {step === 1 && (
          <Form layout="vertical">
            <Form.Item label="验证码">
              <Input placeholder="请输入6位验证码" size="large" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
            </Form.Item>
            <div style={{ marginBottom: 16 }}>
              {countdown > 0 ? (
                <Text type="secondary">{countdown} 秒后重新发送</Text>
              ) : (
                <Button type="link" onClick={sendOtp} style={{ padding: 0 }}>重新发送</Button>
              )}
            </div>
            <Form.Item label="邀请码（选填）">
              <Input placeholder="如有邀请码，请输入" size="large" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
            </Form.Item>
            <Button type="primary" size="large" block loading={loading} onClick={verifyAndLogin}>登录 / 注册</Button>
            <Button style={{ marginTop: 8 }} size="large" block onClick={() => setStep(0)}>返回</Button>
          </Form>
        )}

        <Divider>演示入口</Divider>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button block onClick={() => demoLogin('admin')}>演示管理员登录</Button>
          <Button block onClick={() => demoLogin('merchant')}>演示商户登录</Button>
          <Button block onClick={() => demoLogin('user')}>演示用户登录</Button>
        </Space>
      </Card>
    </div>
  )
}
