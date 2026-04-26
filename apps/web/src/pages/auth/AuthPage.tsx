import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Button, Input, Steps, Form, Typography, message, Tabs, Modal
} from 'antd'
import { LockOutlined, WechatOutlined, UserOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import { useSettingsStore } from '../../store/settings.store'

const { Title, Text } = Typography

export default function AuthPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') || ''
  const { setAuth, detectRole } = useAuthStore()
  const { settings, fetchSettings } = useSettingsStore()

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp')
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [setPasswordModalVisible, setSetPasswordModalVisible] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setPasswordModalLoading, setSetPasswordModalLoading] = useState(false)
  const [pendingRole, setPendingRole] = useState<string | null>(null)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'wechat_login_success') {
        window.location.reload()
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    const code = searchParams.get('wechat_code') || searchParams.get('code')
    if (code) {
      setLoading(true)
      api.wechatCallback(code)
        .then((res: any) => {
          if (!res?.accessToken) throw new Error('登录失败')
          setAuth(res.user, res.accessToken)
          return detectRole()
        })
        .then((role) => {
          if (window.opener) {
            window.opener.postMessage({ type: 'wechat_login_success' }, window.location.origin)
            window.close()
          } else {
            doRedirect(role ?? 'user')
          }
        })
        .catch((e: any) => {
          message.error(typeof e === 'string' ? e : '微信登录失败')
        })
        .finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const doRedirect = (role: 'admin' | 'merchant' | 'user') => {
    if (from && from.startsWith('/')) {
      navigate(from, { replace: true })
      return
    }
    if (role === 'admin') navigate('/portal/admin/dashboard', { replace: true })
    else if (role === 'merchant') navigate('/portal/merchant/dashboard', { replace: true })
    else navigate('/portal/user/home', { replace: true })
  }

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
      if (res.user?.hasPassword === false) {
        setPendingRole(role ?? 'user')
        setSetPasswordModalVisible(true)
      } else {
        doRedirect(role ?? 'user')
      }
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      message.error('请输入有效的手机号')
      return
    }
    if (!password) {
      message.error('请输入密码')
      return
    }
    setPasswordLoading(true)
    try {
      const res: any = await api.loginWithPassword(phone, password)
      if (!res?.accessToken) throw new Error('登录失败')
      setAuth(res.user, res.accessToken)
      const role = await detectRole()
      doRedirect(role ?? 'user')
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '登录失败')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      message.error('密码长度不能少于6位')
      return
    }
    if (newPassword !== confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }
    setSetPasswordModalLoading(true)
    try {
      await api.setPassword(newPassword)
      message.success('密码设置成功')
      setSetPasswordModalVisible(false)
      setNewPassword('')
      setConfirmPassword('')
      doRedirect(pendingRole as any ?? 'user')
    } catch (e: any) {
      message.error(typeof e === 'string' ? e : '设置密码失败')
    } finally {
      setSetPasswordModalLoading(false)
    }
  }

  const handleWechatLogin = () => {
    const appid = settings?.auth?.wechatWebAppId || import.meta.env.VITE_WECHAT_APPID
    if (!appid) {
      message.error('微信网页登录未配置，请先前往后台设置微信网页登录 AppID')
      return
    }
    const redirectUri = encodeURIComponent(window.location.origin + '/auth')
    const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appid}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login#wechat_redirect`
    const popup = window.open(url, 'wechatLogin', 'width=600,height=600,left=200,top=200')
    if (!popup) {
      message.error('弹出窗口被拦截，请允许弹出窗口后重试')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1677ff 0%,#0958d9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 460, borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>HealthCoin</Title>
          <Text type="secondary">健康币平台 · 登录 / 注册</Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as 'otp' | 'password')}
          centered
          items={[
            {
              key: 'otp',
              label: '验证码登录',
              children: (
                <>
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
                </>
              ),
            },
            {
              key: 'password',
              label: '密码登录',
              children: (
                <Form layout="vertical">
                  <Form.Item label="手机号">
                    <Input placeholder="请输入手机号" size="large" maxLength={11} value={phone} onChange={(e) => setPhone(e.target.value)} prefix={<UserOutlined />} />
                  </Form.Item>
                  <Form.Item label="密码">
                    <Input.Password placeholder="请输入密码" size="large" value={password} onChange={(e) => setPassword(e.target.value)} prefix={<LockOutlined />} />
                  </Form.Item>
                  <Button type="primary" size="large" block loading={passwordLoading} onClick={handlePasswordLogin}>登录</Button>
                </Form>
              ),
            },
          ]}
        />

        <div style={{ marginTop: 16 }}>
          <Button
            block
            size="large"
            style={{ background: '#07c160', color: '#fff', borderColor: '#07c160' }}
            icon={<WechatOutlined />}
            onClick={handleWechatLogin}
          >
            微信登录
          </Button>
        </div>

        <Modal
          title="设置登录密码"
          open={setPasswordModalVisible}
          onCancel={() => setSetPasswordModalVisible(false)}
          onOk={handleSetPassword}
          confirmLoading={setPasswordModalLoading}
          maskClosable={false}
        >
          <Form layout="vertical">
            <Form.Item label="密码" required>
              <Input.Password placeholder="请输入密码" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </Form.Item>
            <Form.Item label="确认密码" required>
              <Input.Password placeholder="请再次输入密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  )
}
