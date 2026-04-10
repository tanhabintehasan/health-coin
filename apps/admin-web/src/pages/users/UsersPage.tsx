import { useEffect, useState } from 'react'
import {
  Table, Input, Tag, Typography, Space, Button, Drawer, Descriptions,
  Modal, Form, Select, InputNumber, message, Tree,
} from 'antd'
import { SearchOutlined, WalletOutlined, ApartmentOutlined } from '@ant-design/icons'
import client from '../../api/client'
import dayjs from 'dayjs'

const LEVEL_LABELS: Record<number, string> = {
  1: 'Regular', 2: 'Ambassador', 3: 'Community Agent',
  4: 'County Agent', 5: 'City Agent', 6: 'Provincial Agent',
}

const LEVEL_COLORS: Record<number, string> = {
  1: 'default', 2: 'blue', 3: 'green', 4: 'orange', 5: 'purple', 6: 'gold',
}

const WALLET_TYPE_OPTIONS = [
  { value: 'HEALTH_COIN', label: 'HealthCoin' },
  { value: 'MUTUAL_HEALTH_COIN', label: 'Mutual HealthCoin' },
  { value: 'UNIVERSAL_HEALTH_COIN', label: 'Universal HealthCoin' },
]

function toTreeData(node: any): any {
  return {
    key: node.userId,
    title: `${node.phone || node.userId} (L${node.level ?? 1})`,
    children: (node.referrals ?? []).map(toTreeData),
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // Wallet adjustment
  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [walletTarget, setWalletTarget] = useState<any>(null)
  const [walletForm] = Form.useForm()
  const [adjusting, setAdjusting] = useState(false)

  // Referral tree
  const [referralModalOpen, setReferralModalOpen] = useState(false)
  const [referralTarget, setReferralTarget] = useState<any>(null)
  const [referralTree, setReferralTree] = useState<any>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  const fetchUsers = async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res: any = await client.get(`/admin/users?page=${p}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`)
      setUsers(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const openWalletModal = (record: any) => {
    setWalletTarget(record)
    walletForm.resetFields()
    setWalletModalOpen(true)
  }

  const handleWalletAdjust = async () => {
    const values = await walletForm.validateFields()
    setAdjusting(true)
    try {
      await client.patch(`/admin/users/${walletTarget.id}/wallet`, {
        walletType: values.walletType,
        amount: values.amount,
        reason: values.reason,
      })
      message.success('Wallet adjusted successfully')
      setWalletModalOpen(false)
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Adjustment failed')
    } finally {
      setAdjusting(false)
    }
  }

  const openReferralTree = async (record: any) => {
    setReferralTarget(record)
    setReferralTree(null)
    setReferralModalOpen(true)
    setLoadingTree(true)
    try {
      const res: any = await client.get(`/admin/users/${record.id}/referral-tree`)
      setReferralTree(res.data?.data ?? res.data)
    } catch {
      message.error('Failed to load referral tree')
    } finally {
      setLoadingTree(false)
    }
  }

  const columns = [
    { title: 'Phone', dataIndex: 'phone', key: 'phone' },
    { title: 'Nickname', dataIndex: 'nickname', key: 'nickname', render: (v: string) => v || '-' },
    {
      title: 'Level', dataIndex: 'membershipLevel', key: 'membershipLevel',
      render: (v: number) => <Tag color={LEVEL_COLORS[v]}>{LEVEL_LABELS[v] ?? `L${v}`}</Tag>,
    },
    { title: 'Referral Code', dataIndex: 'referralCode', key: 'referralCode' },
    { title: 'Joined', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    {
      title: 'Status', dataIndex: 'isActive', key: 'isActive',
      render: (v: boolean) => <Tag color={v ? 'success' : 'error'}>{v ? 'Active' : 'Suspended'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelected(record)}>View</Button>
          <Button
            type="link" size="small" icon={<WalletOutlined />}
            onClick={() => openWalletModal(record)}
          >
            Adjust Wallet
          </Button>
          <Button
            type="link" size="small" icon={<ApartmentOutlined />}
            onClick={() => openReferralTree(record)}
          >
            Referral Tree
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Users</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search phone or nickname"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onPressEnter={() => fetchUsers(1, search)}
          style={{ width: 280 }}
        />
        <Button type="primary" onClick={() => fetchUsers(1, search)}>Search</Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={users}
        loading={loading}
        pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchUsers(p, search) } }}
      />

      {/* User Detail Drawer */}
      <Drawer title="User Detail" open={!!selected} onClose={() => setSelected(null)} width={480}>
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selected.phone}</Descriptions.Item>
            <Descriptions.Item label="Nickname">{selected.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="Level">{LEVEL_LABELS[selected.membershipLevel]}</Descriptions.Item>
            <Descriptions.Item label="Referral Code">{selected.referralCode}</Descriptions.Item>
            <Descriptions.Item label="Region">{selected.region?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Lifetime Coins">{selected.totalMutualCoinsEarned?.toString()}</Descriptions.Item>
            <Descriptions.Item label="Joined">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* Wallet Adjustment Modal */}
      <Modal
        title={`Adjust Wallet — ${walletTarget?.phone}`}
        open={walletModalOpen}
        onOk={handleWalletAdjust}
        onCancel={() => setWalletModalOpen(false)}
        confirmLoading={adjusting}
        okText="Apply Adjustment"
      >
        <Form form={walletForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="walletType" label="Wallet Type" rules={[{ required: true }]}>
            <Select options={WALLET_TYPE_OPTIONS} placeholder="Select wallet" />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Amount (¥) — positive to credit, negative to debit"
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="e.g. 10.00 or -5.00" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input placeholder="Reason for adjustment (will be logged)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Referral Tree Modal */}
      <Modal
        title={`Referral Tree — ${referralTarget?.phone}`}
        open={referralModalOpen}
        onCancel={() => setReferralModalOpen(false)}
        footer={null}
        width={560}
      >
        {loadingTree && <div style={{ textAlign: 'center', padding: 32 }}>Loading...</div>}
        {!loadingTree && referralTree && (
          <Tree
            treeData={[toTreeData(referralTree)]}
            defaultExpandAll
            showLine
            selectable={false}
          />
        )}
        {!loadingTree && !referralTree && (
          <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>No referral data</div>
        )}
      </Modal>
    </div>
  )
}
