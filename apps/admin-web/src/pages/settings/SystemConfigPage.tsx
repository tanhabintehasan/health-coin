import { useEffect, useState } from 'react'
import { Form, Button, Card, Typography, message, Spin, Row, Col, Divider, InputNumber, Input, Tooltip } from 'antd'
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons'
import client from '../../api/client'

interface ConfigMeta {
  label: string
  hint: string
  type: 'number' | 'text' | 'password'
  min?: number
  max?: number
  step?: number
}

const CONFIG_META: Record<string, ConfigMeta> = {
  mutual_coin_own_rate: {
    label: 'Mutual Coin — Own Spend Rate',
    hint: 'Fraction of spending awarded as Mutual Coins to the buyer. E.g. 0.5 = 50% back.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  mutual_coin_l1_rate: {
    label: 'Mutual Coin — L1 Referral Rate',
    hint: 'Fraction awarded to the direct referrer (level 1). E.g. 0.25 = 25%.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  mutual_coin_l2_rate: {
    label: 'Mutual Coin — L2 Referral Rate',
    hint: 'Fraction awarded to the second-level referrer. E.g. 0.1 = 10%.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  health_coin_multiplier: {
    label: 'Health Coin Multiplier',
    hint: 'How many HealthCoins are awarded per Mutual Coin earned. E.g. 2.0 = twice as many.',
    type: 'number', min: 0, max: 100, step: 0.1,
  },
  universal_coin_own_rate: {
    label: 'Universal Coin — Own Spend Rate',
    hint: 'Fraction of spending awarded as Universal Coins to the buyer. E.g. 0.2 = 20%.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  universal_coin_l1_rate: {
    label: 'Universal Coin — L1 Referral Rate',
    hint: 'Universal Coin fraction for direct referrer. E.g. 0.1 = 10%.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  withdrawal_commission_rate: {
    label: 'Withdrawal Commission Rate',
    hint: 'Platform fee deducted from each withdrawal. E.g. 0.05 = 5% fee.',
    type: 'number', min: 0, max: 1, step: 0.01,
  },
  order_approval_required: {
    label: 'Product Approval Required',
    hint: 'Set to 1 to require admin approval before products go live. Set to 0 to auto-approve.',
    type: 'number', min: 0, max: 1, step: 1,
  },
  payment_fuiou_enabled: {
    label: 'Fuiou Payment Enabled',
    hint: 'Set to 1 to enable Fuiou payments. Set to 0 to disable.',
    type: 'number', min: 0, max: 1, step: 1,
  },
  payment_lcsw_enabled: {
    label: 'LCSW Payment Enabled',
    hint: 'Set to 1 to enable LCSW (Saobei) payments. Set to 0 to disable.',
    type: 'number', min: 0, max: 1, step: 1,
  },
  payment_coin_enabled: {
    label: 'Coin Payment Enabled',
    hint: 'Set to 1 to enable coin payments. Set to 0 to disable.',
    type: 'number', min: 0, max: 1, step: 1,
  },
  lcsw_merchant_no: {
    label: 'LCSW Merchant No',
    hint: 'LCSW (Saobei) merchant number.',
    type: 'text',
  },
  lcsw_terminal_id: {
    label: 'LCSW Terminal ID',
    hint: 'LCSW terminal ID.',
    type: 'text',
  },
  lcsw_access_token: {
    label: 'LCSW Access Token',
    hint: 'LCSW access token for signing requests.',
    type: 'password',
  },
  lcsw_base_url: {
    label: 'LCSW Base URL',
    hint: 'LCSW API base URL. E.g. http://test.lcsw.cn:8010/lcsw',
    type: 'text',
  },
  sms_enabled: {
    label: 'SMS Enabled',
    hint: 'Set to 1 to enable SMS OTP. Set to 0 to disable.',
    type: 'number', min: 0, max: 1, step: 1,
  },
  otp_expiry_seconds: {
    label: 'OTP Expiry Seconds',
    hint: 'How long an OTP code remains valid. Default 300 = 5 minutes.',
    type: 'number', min: 30, max: 3600, step: 1,
  },
  otp_resend_seconds: {
    label: 'OTP Resend Cooldown',
    hint: 'Minimum seconds between resend requests. Default 60.',
    type: 'number', min: 10, max: 600, step: 1,
  },
  otp_hourly_limit: {
    label: 'OTP Hourly Limit',
    hint: 'Max OTP requests per phone per hour. Default 5.',
    type: 'number', min: 1, max: 20, step: 1,
  },
  sms_provider: {
    label: 'SMS Provider',
    hint: 'Only smsbao is supported.',
    type: 'text',
  },
  sms_template_code: {
    label: 'SMS Template Code',
    hint: 'Template code for your SMS provider (if required).',
    type: 'text',
  },
  sms_sign_name: {
    label: 'SMS Sign Name',
    hint: 'Signature name registered with your SMS provider.',
    type: 'text',
  },
  smsbao_username: {
    label: 'SMSbao Username',
    hint: 'Your SMSbao account username.',
    type: 'text',
  },
  smsbao_password: {
    label: 'SMSbao Password',
    hint: 'Your SMSbao account password.',
    type: 'password',
  },
  smsbao_template: {
    label: 'SMSbao Template',
    hint: 'Use [code] as placeholder for the OTP code.',
    type: 'text',
  },
  wechat_appid: {
    label: 'WeChat Mini Program AppID',
    hint: 'Your WeChat mini program AppID.',
    type: 'text',
  },
  wechat_secret: {
    label: 'WeChat Mini Program Secret',
    hint: 'Your WeChat mini program AppSecret.',
    type: 'password',
  },
}

const COIN_KEYS = ['mutual_coin_own_rate', 'mutual_coin_l1_rate', 'mutual_coin_l2_rate', 'health_coin_multiplier', 'universal_coin_own_rate', 'universal_coin_l1_rate']
const COMMISSION_KEYS = ['withdrawal_commission_rate']
const REVIEW_KEYS = ['order_approval_required']
const PAYMENT_TOGGLE_KEYS = ['payment_fuiou_enabled', 'payment_lcsw_enabled', 'payment_coin_enabled']
const LCSW_KEYS = ['lcsw_merchant_no', 'lcsw_terminal_id', 'lcsw_access_token', 'lcsw_base_url']
const SMS_KEYS = ['sms_enabled', 'otp_expiry_seconds', 'otp_resend_seconds', 'otp_hourly_limit', 'sms_provider', 'sms_template_code', 'sms_sign_name', 'smsbao_username', 'smsbao_password', 'smsbao_template']
const WECHAT_KEYS = ['wechat_appid', 'wechat_secret']

export default function SystemConfigPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res: any = await client.get('/admin/configs')
      const list = Array.isArray(res) ? res : res.data ?? []
      const map: Record<string, string> = {}
      for (const c of list) map[c.key] = c.value
      setConfigs(map)
      const numericMap: Record<string, number | string> = {}
      for (const [k, v] of Object.entries(map)) {
        const parsed = parseFloat(v)
        numericMap[k] = isNaN(parsed) ? v : parsed
      }
      form.setFieldsValue(numericMap)
    } catch (e: any) {
      message.error('Failed to load settings: ' + (e.message || e))
    }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchConfigs() }, [])

  const onSave = async (values: Record<string, number | string>) => {
    setSaving(true)
    try {
      const stringValues: Record<string, string> = {}
      for (const [k, v] of Object.entries(values)) {
        stringValues[k] = String(v ?? '')
      }
      await client.put('/admin/configs', stringValues)
      message.success('Settings saved successfully')
    } catch { message.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  const renderConfigField = (key: string) => {
    const meta = CONFIG_META[key]
    if (!meta) return null
    const input = meta.type === 'number' ? (
      <InputNumber
        style={{ width: '100%' }}
        min={meta.min}
        max={meta.max}
        step={meta.step}
        placeholder={configs[key] ?? ''}
      />
    ) : (
      <Input
        type={meta.type === 'password' ? 'password' : 'text'}
        placeholder={configs[key] ?? ''}
      />
    )
    return (
      <Col xs={24} sm={12} key={key}>
        <Form.Item
          name={key}
          label={
            <span>
              {meta.label}&nbsp;
              <Tooltip title={meta.hint}>
                <InfoCircleOutlined style={{ color: '#1677ff', cursor: 'pointer' }} />
              </Tooltip>
            </span>
          }
          extra={<span style={{ fontSize: 12, color: '#888' }}>{meta.hint}</span>}
        >
          {input}
        </Form.Item>
      </Col>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>System Settings</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left">Coin Reward Rates</Divider>
          <Row gutter={16}>
            {COIN_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">Commissions</Divider>
          <Row gutter={16}>
            {COMMISSION_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">Product Review</Divider>
          <Row gutter={16}>
            {REVIEW_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">Payment Providers</Divider>
          <Row gutter={16}>
            {PAYMENT_TOGGLE_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">LCSW (Saobei) Credentials</Divider>
          <Row gutter={16}>
            {LCSW_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">SMS Configuration</Divider>
          <Row gutter={16}>
            {SMS_KEYS.map(renderConfigField)}
          </Row>

          <Divider orientation="left">WeChat Mini Program</Divider>
          <Row gutter={16}>
            {WECHAT_KEYS.map(renderConfigField)}
          </Row>

          <div style={{ marginTop: 24 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              size="large"
              icon={<SaveOutlined />}
              style={{ minWidth: 160 }}
            >
              Save Settings
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
