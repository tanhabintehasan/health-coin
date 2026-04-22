import { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Button, message, Spin, Row, Col, Divider, Tooltip, Table, Tag, Modal } from 'antd'
import { InfoCircleOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const META: Record<string, { label: string; hint: string; min?: number; max?: number; step?: number }> = {
  platform_commission_rate: { label: '平台佣金比例', hint: '每笔订单平台抽取的佣金比例，例如 0.05 表示 5%', min: 0, max: 1, step: 0.01 },
  withdrawal_commission_rate: { label: '提现手续费比例', hint: '用户提现时平台扣除的手续费比例', min: 0, max: 1, step: 0.01 },
  merchant_commission_rate: { label: '商户默认佣金比例', hint: '新入驻商户的默认平台抽成比例', min: 0, max: 1, step: 0.01 },
}

const KEYS = Object.keys(META)

const LEVEL_NAMES: Record<number, string> = {
  1: '普通会员',
  2: '健康大使',
  3: '社区代理',
  4: '县级代理',
  5: '市级代理',
  6: '省级代理',
}

export default function CommissionPage() {
  const { isMobile } = useResponsive()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [tiers, setTiers] = useState<any[]>([])
  const [tiersLoading, setTiersLoading] = useState(true)
  const [editTier, setEditTier] = useState<any>(null)
  const [tierForm] = Form.useForm()
  const [savingTier, setSavingTier] = useState(false)

  useEffect(() => {
    Promise.all([
      api.getAdminConfigs().then((res: any) => {
        const map: Record<string, number> = {}
        for (const c of (res ?? [])) {
          if (KEYS.includes(c.key)) {
            const parsed = parseFloat(c.value)
            map[c.key] = isNaN(parsed) ? 0 : parsed
          }
        }
        form.setFieldsValue(map)
      }),
      api.getAdminTiers().then((res: any) => {
        setTiers(res ?? [])
      }),
    ]).catch((err: any) => {
      console.error('Failed to load commission data:', err)
      message.error(err || 'Failed to load data')
    }).finally(() => {
      setLoading(false)
      setTiersLoading(false)
    })
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

  const openEditTier = (tier: any) => {
    setEditTier(tier)
    tierForm.setFieldsValue({
      regionalCoinRate: Number(tier.regionalCoinRate) * 100,
    })
  }

  const handleSaveTier = async () => {
    const values = await tierForm.validateFields()
    setSavingTier(true)
    try {
      await api.updateAdminTier(editTier.level, {
        regionalCoinRate: values.regionalCoinRate / 100,
      })
      message.success('级别返佣比例已更新')
      setEditTier(null)
      const res = await api.getAdminTiers()
      setTiers(res ?? [])
    } catch (err: any) {
      message.error(err || '更新失败')
    } finally {
      setSavingTier(false)
    }
  }

  const tierColumns = [
    {
      title: '会员级别',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (v: number) => (
        <Tag color="blue">L{v}</Tag>
      ),
    },
    {
      title: '级别名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '辖区返佣比例 (m%)',
      dataIndex: 'regionalCoinRate',
      key: 'regionalCoinRate',
      render: (v: any) => {
        const pct = (Number(v) * 100).toFixed(0)
        return pct === '0' ? <Tag color="default">0%</Tag> : <Tag color="purple">{pct}%</Tag>
      },
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditTier(r)}>
          编辑
        </Button>
      ),
    },
  ]

  if (loading || tiersLoading) {
    return (
      <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>佣金与手续费管理</h2>

      <Card style={{ marginBottom: 24 }}>
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
            <Button type="primary" htmlType="submit" loading={saving} size="large" icon={<SaveOutlined />} block={isMobile} style={{ minWidth: isMobile ? '100%' : 160 }}>
              保存平台佣金设置
            </Button>
          </div>
        </Form>
      </Card>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>会员级别辖区返佣比例 (m%)</h3>
          <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
            万能健康币计算公式中“所属辖区会员消费 × m%”的 m 值。可在下方直接修改每个级别的比例。
          </p>
        </div>
        <Table
          rowKey="level"
          columns={tierColumns}
          dataSource={tiers}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={`编辑 L${editTier?.level} — ${LEVEL_NAMES[editTier?.level] ?? editTier?.name} 的辖区返佣比例`}
        open={!!editTier}
        onOk={handleSaveTier}
        onCancel={() => setEditTier(null)}
        confirmLoading={savingTier}
        okText="保存"
        width={isMobile ? '100%' : 480}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={tierForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="regionalCoinRate"
            label="辖区返佣比例 (m%)"
            extra="例如：社区代理填 20，市级代理填 10。普通会员/健康大使填 0。"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} step={1} suffix="%" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
