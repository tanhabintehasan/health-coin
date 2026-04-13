import { useEffect, useState } from 'react'
import { Table, Input, Tag, Typography, Space, Button, Drawer, Descriptions, Modal, Form, Select, InputNumber, message, Tree, Spin } from 'antd'
import { SearchOutlined, WalletOutlined, ApartmentOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'
import { useResponsive } from '../../hooks/useResponsive'

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
  const { isMobile } = useResponsive()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [walletModalOpen, setWalletModalOpen] = useState(false)
  const [walletTarget, setWalletTarget] = useState<any>(null)
  const [walletForm] = Form.useForm()
  const [adjusting, setAdjusting] = useState(false)

  const [referralModalOpen, setReferralModalOpen] = useState(false)
  const [referralTarget, setReferralTarget] = useState<any>(null)
  const [referralTree, setReferralTree] = useState<any>(null)
  const [loadingTree, setLoadingTree] = useState(false)

  const fetchUsers = async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res: any = await api.getAdminUsers({ page: p, limit: 20, search: q || undefined })
      setUsers(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
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
      await api.adjustWallet(walletTarget.id, {
        walletType: values.walletType,
        amount: values.amount,
        reason: values.reason,
      })
      message.success('Wallet adjusted successfully')
      setWalletModalOpen(false)
    } catch (err: any) {
      message.error(err || 'Adjustment failed')
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
      const res = await api.getReferralTree(record.id)
      setReferralTree(res)
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
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => setSelected(record)}>View</Button>
          <Button type="link" size="small" icon={<WalletOutlined />} onClick={() => openWalletModal(record)}>Adjust Wallet</Button>
          <Button type="link" size="small" icon={<ApartmentOutlined />} onClick={() => openReferralTree(record)}>Referral Tree</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Users</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="Search phone or nickname" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => fetchUsers(1, search)} style={{ width: isMobile ? '100%' : 280 }} />
        <Button type="primary" onClick={() => fetchUsers(1, search)}>Search</Button>
      </Space>

      <div className="table-responsive">
        <Table rowKey="id" columns={columns} dataSource={users} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchUsers(p, search) } }} scroll={{ x: 'max-content' }} />
      </div>

      <Drawer title="User Detail" open={!!selected} onClose={() => setSelected(null)} width={isMobile ? '100%' : 480} style={{ maxWidth: 'calc(100vw - 32px)' }}>
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selected.id}</Descriptions.Item>
            <Descriptions.Item label="Phone">{selected.phone}</Descriptions.Item>
            <Descriptions.Item label="Nickname">{selected.nickname || '-'}</Descriptions.Item>
            <Descriptions.Item label="Level">{LEVEL_LABELS[selected.membershipLevel]}</Descriptions.Item>
            <Descriptions.Item label="Referral Code">{selected.referralCode}</Descriptions.Item>
            <Descriptions.Item label="Region">{selected.region?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Joined">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal title={`Adjust Wallet — ${walletTarget?.phone}`} open={walletModalOpen} onOk={handleWalletAdjust} onCancel={() => setWalletModalOpen(false)} confirmLoading={adjusting} okText="Apply Adjustment" style={{ maxWidth: 'calc(100vw - 32px)' }}>
        <Form form={walletForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="walletType" label="Wallet Type" rules={[{ required: true }]}>
            <Select options={WALLET_TYPE_OPTIONS} placeholder="Select wallet" />
          </Form.Item>
          <Form.Item name="amount" label="Amount (¥) — positive to credit, negative to debit" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={2} placeholder="e.g. 10.00 or -5.00" />
          </Form.Item>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input placeholder="Reason for adjustment (will be logged)" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={`Referral Tree — ${referralTarget?.phone}`} open={referralModalOpen} onCancel={() => setReferralModalOpen(false)} footer={null} width={isMobile ? '100%' : 560} style={{ maxWidth: 'calc(100vw - 32px)' }}>
        {loadingTree && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
        {!loadingTree && referralTree && <Tree treeData={[toTreeData(referralTree)]} defaultExpandAll showLine selectable={false} />}
        {!loadingTree && !referralTree && <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>No referral data</div>}
      </Modal>
    </div>
  )
}
