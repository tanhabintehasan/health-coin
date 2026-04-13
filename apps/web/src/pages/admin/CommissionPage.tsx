import { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Button, message, Spin, Row, Col, Divider, Tooltip } from 'antd'
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

const META: Record<string, { label: string; hint: string; min?: number; max?: number; step?: number }> = {
  platform_commission_rate: { label: '平台佣金比例', hint: '每笔订单平台抽取的佣金比例，例如 0.05 表示 5%', min: 0, max: 1, step: 0.01 },
  withdrawal_commission_rate: { label: '提现手续费比例', hint: '用户提现时平台扣除的手续费比例', min: 0, max: 1, step: 0.01 },
  merchant_commission_rate: { label: '商户默认佣金比例', hint: '新入驻商户的默认平台抽成比例', min: 0, max: 1, step: 0.01 },
}

const KEYS = Object.keys(META)

export default function CommissionPage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getAdminConfigs().then((res: any) => {
      const map: Record<string, number> = {}
      for (const c of (res ?? [])) {
        if (KEYS.includes(c.key)) {
          const parsed = parseFloat(c.value)
          map[c.key] = isNaN(parsed) ? 0 : parsed
        }
      }
      form.setFieldsValue(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [form])

  const onSave = async (values: Record<string, number>) => {
    setSaving(true)
    try {
      const stringValues: Record<string, string> = {}
      for (const k of KEYS) stringValues[k] = String(values[k] ?? '0')
      await api.updateAdminConfigs(stringValues)
      message.success('佣金设置已保存')
    } catch (err: any) {
      message.error(err || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>佣金与手续费管理</h2>
      <Card>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Divider orientation="left">平台佣金</Divider>
          <Row gutter={16}>
            {KEYS.map((key) => (
              <Col xs={24} sm={12} key={key}>
                <Form.Item
                  name={key}
                  label={
                    <span>
                      {META[key].label}&nbsp;
                      <Tooltip title={META[key].hint}>
                        <InfoCircleOutlined style={{ color: '#1677ff' }} />
                      </Tooltip>
                    </span>
                  }
                  extra={<span style={{ fontSize: 12, color: '#888' }}>{META[key].hint}</span>}
                >
                  <InputNumber style={{ width: '100%' }} min={META[key].min} max={META[key].max} step={META[key].step} />
                </Form.Item>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />} style={{ minWidth: 160 }}>保存设置</Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}
