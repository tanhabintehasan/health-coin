import { useEffect, useState } from 'react'
import {
  Table, Typography, Button, Modal, Form, Input, InputNumber, message, Tag, Space,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import client from '../../api/client'

const LEVEL_NAMES: Record<number, string> = {
  1: 'Regular Member', 2: 'Health Ambassador', 3: 'Community Agent',
  4: 'County Agent', 5: 'City Agent', 6: 'Provincial Agent',
}

export default function MembershipPage() {
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editTarget, setEditTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchTiers = async () => {
    setLoading(true)
    try {
      const res: any = await client.get('/admin/membership/tiers')
      setTiers(res.data ?? [])
    } catch { setTiers([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchTiers() }, [])

  const openEdit = (tier: any) => {
    setEditTarget(tier)
    form.setFieldsValue({
      name: tier.name,
      minCoins: Number(tier.minCoins) / 100,
      regionalCoinRate: Number(tier.regionalCoinRate) * 100,
      description: tier.description ?? '',
    })
  }

  const handleSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      await client.patch(`/admin/membership/tiers/${editTarget.level}`, {
        name: values.name,
        minCoins: values.minCoins,         // in coins (not ×100) — backend converts
        regionalCoinRate: values.regionalCoinRate / 100,  // send as 0–1 fraction
        description: values.description,
      })
      message.success('Tier updated')
      setEditTarget(null)
      fetchTiers()
    } catch {
      message.error('Failed to update tier')
    } finally { setSaving(false) }
  }

  const columns = [
    {
      title: 'Level', dataIndex: 'level', key: 'level', width: 70,
      render: (v: number) => <Tag color="blue">L{v}</Tag>,
    },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Upgrade Threshold (Mutual Coins)',
      dataIndex: 'minCoins',
      key: 'minCoins',
      render: (v: any) => (Number(v) / 100).toLocaleString(),
    },
    {
      title: 'Regional Rate (m%)',
      dataIndex: 'regionalCoinRate',
      key: 'regionalCoinRate',
      render: (v: any) => {
        const pct = (Number(v) * 100).toFixed(0)
        return pct === '0'
          ? <Tag color="default">0% (no regional reward)</Tag>
          : <Tag color="purple">{pct}%</Tag>
      },
    },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: 'Edit', key: 'action', width: 80,
      render: (_: any, r: any) => (
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 8 }}>Membership Tiers</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        Configure tier names, upgrade thresholds, and regional coin reward rates (m%) per level.
      </Typography.Text>

      <Table
        rowKey="level"
        columns={columns}
        dataSource={tiers}
        loading={loading}
        pagination={false}
      />

      <Modal
        title={`Edit Tier L${editTarget?.level} — ${LEVEL_NAMES[editTarget?.level] ?? ''}`}
        open={!!editTarget}
        onOk={handleSave}
        onCancel={() => setEditTarget(null)}
        confirmLoading={saving}
        okText="Save Changes"
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tier Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Health Ambassador" />
          </Form.Item>
          <Form.Item
            name="minCoins"
            label="Upgrade Threshold (Mutual Coins)"
            extra="Lifetime mutual coins required to reach this tier automatically"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} precision={2} placeholder="e.g. 1000" />
          </Form.Item>
          <Form.Item
            name="regionalCoinRate"
            label="Regional Coin Rate — m% (0 for levels 1–2)"
            extra="Percentage of regional members' spending awarded as Universal Coins. Set 0 for non-agent tiers."
          >
            <InputNumber min={0} max={100} step={1} suffix="%" style={{ width: '100%' }} placeholder="e.g. 20" />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Short description of this tier's benefits" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
