import { useEffect, useState } from 'react'
import { Table, Typography, Button, Modal, Form, Input, InputNumber, message, Tag, Popconfirm, Space, Alert } from 'antd'
import { EditOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const LEVEL_NAMES: Record<number, string> = {
  1: '普通会员',
  2: '健康大使',
  3: '社区代理',
  4: '县级代理',
  5: '市级代理',
  6: '省级代理',
}

export default function MembershipPage() {
  const { isMobile } = useResponsive()
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editTarget, setEditTarget] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addForm] = Form.useForm()

  const [seeding, setSeeding] = useState(false)

  const fetchTiers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res: any = await api.getAdminTiers()
      setTiers(res ?? [])
    } catch (err: any) {
      console.error('Failed to load tiers:', err)
      setError(err || 'Failed to load membership tiers. Please try again.')
      setTiers([])
    } finally {
      setLoading(false)
    }
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
      await api.updateAdminTier(editTarget.level, {
        name: values.name,
        minCoins: values.minCoins,
        regionalCoinRate: values.regionalCoinRate / 100,
        description: values.description,
      })
      message.success('Tier updated successfully')
      setEditTarget(null)
      fetchTiers()
    } catch (err: any) {
      message.error(err || 'Failed to update tier')
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    const values = await addForm.validateFields()
    setAdding(true)
    try {
      await api.createAdminTier({
        level: values.level,
        name: values.name,
        minCoins: values.minCoins,
        regionalCoinRate: values.regionalCoinRate / 100,
        description: values.description ?? '',
      })
      message.success('New tier created successfully')
      setIsAddModalOpen(false)
      addForm.resetFields()
      fetchTiers()
    } catch (err: any) {
      message.error(err || 'Failed to create tier')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (level: number) => {
    try {
      await api.deleteAdminTier(level)
      message.success('Tier deleted successfully')
      fetchTiers()
    } catch (err: any) {
      message.error(err || 'Failed to delete tier')
    }
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await api.seedAdminTiers()
      message.success('Default tiers restored successfully')
      fetchTiers()
    } catch (err: any) {
      message.error(err || 'Failed to seed tiers')
    } finally {
      setSeeding(false)
    }
  }

  const columns = [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (v: number) => <Tag color="blue">L{v}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Upgrade Threshold (Mutual Coins)',
      dataIndex: 'minCoins',
      key: 'minCoins',
      render: (v: any) => (Number(v) / 100).toLocaleString(),
    },
    {
      title: 'Commission Rate (m%)',
      dataIndex: 'regionalCoinRate',
      key: 'regionalCoinRate',
      render: (v: any) => {
        const pct = (Number(v) * 100).toFixed(0)
        return pct === '0' ? <Tag color="default">0%</Tag> : <Tag color="purple">{pct}%</Tag>
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 140,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this tier?"
            description="This cannot be undone. Users assigned to this level must be reassigned first."
            onConfirm={() => handleDelete(r.level)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Del
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Typography.Title level={4} style={{ marginBottom: 4 }}>Membership Tiers</Typography.Title>
          <Typography.Text type="secondary">
            Configure tier names, upgrade thresholds, and commission rates (m%) per level.
          </Typography.Text>
        </div>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsAddModalOpen(true)}>
            Add New Tier
          </Button>
          {tiers.length === 0 && (
            <Button icon={<ReloadOutlined />} loading={seeding} onClick={handleSeed}>
              Restore Defaults
            </Button>
          )}
        </Space>
      </div>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" danger onClick={fetchTiers}>
              Retry
            </Button>
          }
        />
      )}

      <div className="table-responsive">
        <Table
          rowKey="level"
          columns={columns}
          dataSource={tiers}
          loading={loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No membership tiers found. Click "Restore Defaults" to seed the default 6 tiers.' }}
        />
      </div>

      {/* Edit Modal */}
      <Modal
        title={`Edit Tier L${editTarget?.level} — ${LEVEL_NAMES[editTarget?.level] ?? ''}`}
        open={!!editTarget}
        onOk={handleSave}
        onCancel={() => setEditTarget(null)}
        confirmLoading={saving}
        okText="Save Changes"
        width={isMobile ? '100%' : 520}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
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
            label="Commission Rate — m% (0 for levels 1–2)"
            extra="Percentage of regional members' spending awarded as Universal Coins. Set 0 for non-agent tiers."
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} step={1} suffix="%" style={{ width: '100%' }} placeholder="e.g. 20" />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Short description of this tier's benefits" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Modal */}
      <Modal
        title="Add New Membership Tier"
        open={isAddModalOpen}
        onOk={handleAdd}
        onCancel={() => { setIsAddModalOpen(false); addForm.resetFields() }}
        confirmLoading={adding}
        okText="Create Tier"
        width={isMobile ? '100%' : 520}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={addForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="level"
            label="Level Number"
            extra="Must be unique. Higher number = higher tier."
            rules={[{ required: true, type: 'integer', min: 1, message: 'Level must be a positive integer' }]}
          >
            <InputNumber min={1} step={1} style={{ width: '100%' }} placeholder="e.g. 7" />
          </Form.Item>
          <Form.Item name="name" label="Tier Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. National Agent" />
          </Form.Item>
          <Form.Item
            name="minCoins"
            label="Upgrade Threshold (Mutual Coins)"
            extra="Lifetime mutual coins required to reach this tier automatically"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} precision={2} placeholder="e.g. 200000" />
          </Form.Item>
          <Form.Item
            name="regionalCoinRate"
            label="Commission Rate — m%"
            extra="Percentage of regional members' spending awarded as Universal Coins"
            rules={[{ required: true }]}
            initialValue={0}
          >
            <InputNumber min={0} max={100} step={1} suffix="%" style={{ width: '100%' }} placeholder="e.g. 5" />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Short description of this tier's benefits" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
