import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Button, Input, Steps, Form, Typography, Divider, message, Row, Col
} from 'antd'
import { SafetyOutlined, ShopOutlined, UserOutlined, ShoppingOutlined, FileTextOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'

const { Title, Text } = Typography

// TEMPORARY DEMO USERS — used only for client review.
// Controlled by VITE_DEMO_LOGIN_ENABLED. Safe to remove after client review.
const DEMO_USERS: Record<'admin' | 'merchant' | 'user', any> = {
  admin: {
    id: 'demo-admin',
    phone: '13800000001',
    nickname: 'Demo Admin',
    membershipLevel: 1,
    referralCode: 'ADMIN000',
    isNewUser: false,
  },
  merchant: {
    id: 'demo-merchant',
    phone: '13800000002',
    nickname: 'Demo Merchant',
    membershipLevel: 2,
    referralCode: 'MERCH000',
    isNewUser: false,
  },
  user: {
    id: 'demo-user',
    phone: '13800000004',
    nickname: 'Demo User',
    membershipLevel: 1,
    referralCode: 'USER0000',
    isNewUser: false,
  },
}

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') || ''
  const { setAuth } = useAuthStore()

  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
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
    setSendingOtp(true)
    try {
      const otpRes: any = await api.sendOtp(phone)
      if (otpRes?.code) {
        message.success(`验证码: ${otpRes.code}（短信未配置，测试模式显示验证码）`, 8)
      } else {
        message.success('验证码已发送')
      }
      setCountdown(60)
      setStep(1)
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '发送失败，请稍后重试')
    } finally {
      setSendingOtp(false)
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
      // Role will be detected by layout/guard flow
      doRedirect('user')
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // TEMPORARY DEMO ACCESS — frontend-only, bypasses OTP/Redis/SMS/backend auth.
  // Controlled by VITE_DEMO_LOGIN_ENABLED env var.
  // Sets a demo token and user so ProtectedRoute/RoleRoute behave normally.
  // Safe to remove after client review is complete.
  // ---------------------------------------------------------------------------
  const enterDemo = async (role: 'admin' | 'merchant' | 'user') => {
    // Try real backend demo login first.
    // If backend fails (e.g. demo disabled, validation error, unreachable),
    // show the actual reason and fall back to frontend-only mock mode.
    try {
      const res: any = await api.demoLogin(role)
      if (res?.accessToken) {
        setAuth(res.user, res.accessToken, role)
        doRedirect(role)
        return
      }
    } catch (e: any) {
      const reason = typeof e === 'string' ? e : '演示登录失败'
      message.error(`${reason}，已切换为离线演示模式`)
    }
    setAuth(DEMO_USERS[role], 'demo_token', role)
    doRedirect(role)
  }

  const demoEnabled = import.meta.env.VITE_DEMO_LOGIN_ENABLED === 'true'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1677ff 0%,#0958d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 460, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.15)' }}>
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
            <Button type="primary" size="large" block loading={sendingOtp} onClick={sendOtp}>获取验证码</Button>
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

        {/* TEMPORARY DEMO ACCESS UI — controlled by VITE_DEMO_LOGIN_ENABLED. Safe to remove after client review. */}
        {demoEnabled && (
          <>
            <Divider style={{ marginTop: 24 }}>快速演示入口</Divider>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Card hoverable size="small" onClick={() => enterDemo('admin')} bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                  <SafetyOutlined style={{ fontSize: 28, color: '#722ed1', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>管理员后台</div>
                  <div style={{ fontSize: 12, color: '#888' }}>数据概览 · 审核管理</div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card hoverable size="small" onClick={() => enterDemo('merchant')} bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                  <ShopOutlined style={{ fontSize: 28, color: '#52c41a', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>商户工作台</div>
                  <div style={{ fontSize: 12, color: '#888' }}>商品订单 · 核销结算</div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card hoverable size="small" onClick={() => enterDemo('user')} bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                  <UserOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>会员首页</div>
                  <div style={{ fontSize: 12, color: '#888' }}>购物下单 · 钱包健康</div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card hoverable size="small" onClick={() => navigate('/shop')} bodyStyle={{ textAlign: 'center', padding: '16px 8px' }}>
                  <ShoppingOutlined style={{ fontSize: 28, color: '#fa8c16', marginBottom: 8 }} />
                  <div style={{ fontWeight: 500 }}>积分商城</div>
                  <div style={{ fontSize: 12, color: '#888' }}>浏览商品 · 分类筛选</div>
                </Card>
              </Col>
            </Row>
            <Button block style={{ marginTop: 12 }} icon={<FileTextOutlined />} onClick={() => navigate('/merchant-join')}>预览商户入驻页</Button>
          </>
        )}
      </Card>
    </div>
  )
}
