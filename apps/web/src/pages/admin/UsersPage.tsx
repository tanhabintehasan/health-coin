import { useEffect, useState } from 'react'
import { Table, Input, Tag, Typography, Space, Button, Drawer, Descriptions, Modal, Form, Select, InputNumber, message, Tree, Spin, Upload } from 'antd'
import { SearchOutlined, WalletOutlined, ApartmentOutlined, PlusOutlined, EditOutlined, UploadOutlined } from '@ant-design/icons'
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

const LEVEL_OPTIONS = [
  { value: 1, label: 'Regular (L1)' },
  { value: 2, label: 'Ambassador (L2)' },
  { value: 3, label: 'Community Agent (L3)' },
  { value: 4, label: 'County Agent (L4)' },
  { value: 5, label: 'City Agent (L5)' },
  { value: 6, label: 'Provincial Agent (L6)' },
]

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

function flattenRegions(nodes: any[]): any[] {
  const result: any[] = []
  for (const node of nodes ?? []) {
    result.push({ value: node.id, label: node.name })
    if (node.children?.length) {
      result.push(...flattenRegions(node.children))
    }
  }
  return result
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

  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userEditing, setUserEditing] = useState<any>(null)
  const [userForm] = Form.useForm()
  const [savingUser, setSavingUser] = useState(false)
  const [regions, setRegions] = useState<any[]>([])

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

  useEffect(() => {
    api.getRegionsTree().then((tree: any[]) => {
      setRegions(flattenRegions(tree))
    }).catch(() => setRegions([]))
  }, [])

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

  const openAddUser = () => {
    setUserEditing(null)
    userForm.resetFields()
    setUserModalOpen(true)
  }

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e
    return e?.fileList
  }

  const openEditUser = (record: any) => {
    setUserEditing(record)
    userForm.setFieldsValue({
      phone: record.phone,
      nickname: record.nickname,
      membershipLevel: record.membershipLevel,
      regionId: record.regionId,
      isActive: record.isActive,
      avatarFile: record.avatarUrl ? [{ uid: '0', name: 'avatar', status: 'done', url: record.avatarUrl }] : [],
    })
    setUserModalOpen(true)
  }

  const handleSaveUser = async () => {
    const values = await userForm.validateFields()
    setSavingUser(true)
    try {
      let avatarUrl = undefined
      if (values.avatarFile?.[0]?.originFileObj) {
        const res: any = await api.uploadFile(values.avatarFile[0].originFileObj)
        avatarUrl = res.url
      } else if (values.avatarFile?.[0]?.url) {
        avatarUrl = values.avatarFile[0].url
      }

      if (userEditing) {
        const payload: any = {}
        if (values.phone !== undefined) payload.phone = values.phone
        if (values.password) payload.password = values.password
        if (values.nickname !== undefined) payload.nickname = values.nickname
        if (values.membershipLevel !== undefined) payload.membershipLevel = values.membershipLevel
        if (values.regionId !== undefined) payload.regionId = values.regionId
        if (avatarUrl !== undefined) payload.avatarUrl = avatarUrl
        if (values.isActive !== undefined) payload.isActive = values.isActive
        await api.updateUser(userEditing.id, payload)
        message.success('User updated successfully')
      } else {
        await api.createUser({ ...values, avatarUrl })
        message.success('User created successfully')
      }
      setUserModalOpen(false)
      fetchUsers(page, search)
    } catch (err: any) {
      message.error(err || 'Save failed')
    } finally {
      setSavingUser(false)
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
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditUser(record)}>Edit</Button>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openAddUser}>Add User</Button>
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

      <Modal
        title={userEditing ? `Edit User — ${userEditing.phone}` : 'Add User'}
        open={userModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setUserModalOpen(false)}
        confirmLoading={savingUser}
        okText={userEditing ? 'Update' : 'Create'}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <Form form={userForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: !userEditing, message: 'Phone is required' }, { pattern: /^\d+$/, message: 'Phone must contain only digits' }]}
          >
            <Input placeholder="e.g. 13800138000" maxLength={20} />
          </Form.Item>
          <Form.Item
            name="password"
            label={userEditing ? 'Password (leave blank to keep unchanged)' : 'Password'}
            rules={[{ required: !userEditing, message: 'Password is required' }]}
          >
            <Input.Password placeholder="Min 6 characters" />
          </Form.Item>
          <Form.Item name="nickname" label="Nickname">
            <Input placeholder="User nickname" maxLength={100} />
          </Form.Item>
          <Form.Item name="avatarFile" label="Avatar" valuePropName="fileList" getValueFromEvent={normFile}>
            <Upload beforeUpload={() => false} maxCount={1} listType="picture-card" accept="image/*">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <UploadOutlined />
                <div style={{ marginTop: 4 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item name="membershipLevel" label="Membership Level" rules={[{ required: true }]}>
            <Select options={LEVEL_OPTIONS} placeholder="Select level" />
          </Form.Item>
          <Form.Item name="regionId" label="Region">
            <Select
              options={regions}
              placeholder="Select region"
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              allowClear
            />
          </Form.Item>
          <Form.Item name="isActive" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: true, label: 'Active' },
                { value: false, label: 'Suspended' },
              ]}
              placeholder="Select status"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
