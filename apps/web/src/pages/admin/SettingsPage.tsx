import { useEffect, useState } from 'react'
import { Form, Button, Card, Typography, message, Spin, Row, Col, Divider, InputNumber, Tooltip } from 'antd'
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

interface ConfigMeta { label: string; hint: string; min?: number; max?: number; step?: number }

const CONFIG_META: Record<string, ConfigMeta> = {
  mutual_coin_own_rate: { label: 'Mutual Coin — Own Spend Rate', hint: 'Fraction of spending awarded as Mutual Coins to the buyer. E.g. 0.5 = 50% back.', min: 0, max: 1, step: 0.01 },
  mutual_coin_l1_rate: { label: 'Mutual Coin — L1 Referral Rate', hint: 'Fraction awarded to the direct referrer (level 1). E.g. 0.25 = 25%.', min: 0, max: 1, step: 0.01 },
  mutual_coin_l2_rate: { label: 'Mutual Coin — L2 Referral Rate', hint: 'Fraction awarded to the second-level referrer. E.g. 0.1 = 10%.', min: 0, max: 1, step: 0.01 },
  health_coin_multiplier: { label: 'Health Coin Multiplier', hint: 'How many HealthCoins are awarded per Mutual Coin earned. E.g. 2.0 = twice as many.', min: 0, max: 100, step: 0.1 },
  universal_coin_own_rate: { label: 'Universal Coin — Own Spend Rate', hint: 'Fraction of spending awarded as Universal Coins to the buyer. E.g. 0.2 = 20%.', min: 0, max: 1, step: 0.01 },
  universal_coin_l1_rate: { label: 'Universal Coin — L1 Referral Rate', hint: 'Universal Coin fraction for direct referrer. E.g. 0.1 = 10%.', min: 0, max: 1, step: 0.01 },
  withdrawal_commission_rate: { label: 'Withdrawal Commission Rate', hint: 'Platform fee deducted from each withdrawal. E.g. 0.05 = 5% fee.', min: 0, max: 1, step: 0.01 },
  order_approval_required: { label: 'Product Approval Required', hint: 'Set to 1 to require admin approval before products go live. Set to 0 to auto-approve.', min: 0, max: 1, step: 1 },
}

const COIN_KEYS = ['mutual_coin_own_rate', 'mutual_coin_l1_rate', 'mutual_coin_l2_rate', 'health_coin_multiplier', 'universal_coin_own_rate', 'universal_coin_l1_rate']
const COMMISSION_KEYS = ['withdrawal_commission_rate']
const REVIEW_KEYS = ['order_approval_required']

export default function SettingsPage() {
  const [configs, setConfigs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const res: any = await api.getAdminConfigs()
      const map: Record<string, string> = {}
      for (const c of (res ?? [])) map[c.key] = c.value
      setConfigs(map)
      const numericMap: Record<string, number | string> = {}
      for (const [k, v] of Object.entries(map)) {
        const parsed = parseFloat(v)
        numericMap[k] = isNaN(parsed) ? v : parsed
      }
      form.setFieldsValue(numericMap)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchConfigs() }, [])

  const onSave = async (values: Record<string, number | string>) => {
    setSaving(true)
    try {
      const stringValues: Record<string, string> = {}
      for (const [k, v] of Object.entries(values)) stringValues[k] = String(v ?? '')
      await api.updateAdminConfigs(stringValues)
      message.success('Settings saved successfully')
    } catch (err: any) { message.error(err || 'Failed to save settings') } finally { setSaving(false) }
  }

  const renderConfigField = (key: string) => {
    const meta = CONFIG_META[key]
    if (!meta) return null
    return (
      <Col xs={24} sm={12} key={key}>
        <Form.Item name={key} label={<span>{meta.label}&nbsp;<Tooltip title={meta.hint}><InfoCircleOutlined style={{ color: '#1677ff', cursor: 'pointer' }} /></Tooltip></span>} extra={<span style={{ fontSize: 12, color: '#888' }}>{meta.hint}</span>}>
          <InputNumber style={{ width: '100%' }} min={meta.min} max={meta.max} step={meta.step} placeholder={configs[key] ?? ''} />
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
          <Row gutter={16}>{COIN_KEYS.map(renderConfigField)}</Row>
          <Divider orientation="left">Commissions</Divider>
          <Row gutter={16}>{COMMISSION_KEYS.map(renderConfigField)}</Row>
          <Divider orientation="left">Product Review</Divider>
          <Row gutter={16}>{REVIEW_KEYS.map(renderConfigField)}</Row>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />} style={{ minWidth: 160 }}>Save Settings</Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
