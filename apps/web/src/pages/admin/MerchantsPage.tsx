import { useEffect, useState } from 'react'
import { Table, Tag, Button, Typography, Space, message, Popconfirm, Tabs, Drawer, Descriptions, Input } from 'antd'
import { CheckOutlined, CloseOutlined, StopOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange', APPROVED: 'success', REJECTED: 'error', SUSPENDED: 'default',
}

const STATUS_TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'SUSPENDED', label: 'Suspended' },
  { key: '', label: 'All' },
]

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')

  const fetchMerchants = async (status = activeTab, p = 1) => {
    setLoading(true)
    try {
      const res: any = await api.getAdminMerchants({ page: p, limit: 20, status: status || undefined })
      setMerchants(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch { setMerchants([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchMerchants() }, [])

  const handleApprove = async (id: string) => {
    try { await api.approveMerchant(id); message.success('Merchant approved'); fetchMerchants(); if (selected?.id === id) setSelected(null) }
    catch { message.error('Failed to approve') }
  }

  const handleReject = async (id: string) => {
    try { await api.rejectMerchant(id, rejectNote || undefined); message.success('Merchant rejected'); setRejectNote(''); fetchMerchants(); if (selected?.id === id) setSelected(null) }
    catch { message.error('Failed to reject') }
  }

  const handleSuspend = async (id: string, suspend: boolean) => {
    try { await api.suspendMerchant(id, suspend); message.success(suspend ? 'Merchant suspended' : 'Merchant reactivated'); fetchMerchants(); if (selected?.id === id) setSelected(null) }
    catch { message.error('Action failed') }
  }

  const columns = [
    { title: 'Store Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Owner', key: 'owner', render: (_: any, r: any) => r.owner?.phone || '-' },
    { title: 'Region', key: 'region', render: (_: any, r: any) => r.region?.name || '-' },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Applied', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    {
      title: 'Actions', key: 'actions', width: 240,
      render: (_: any, r: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => setSelected(r)}>Detail</Button>
          {r.status === 'PENDING' && (
            <>
              <Popconfirm title="Approve this merchant?" onConfirm={() => handleApprove(r.id)}>
                <Button type="primary" size="small" icon={<CheckOutlined />}>Approve</Button>
              </Popconfirm>
              <Popconfirm title="Reject this merchant?" onConfirm={() => handleReject(r.id)}>
                <Button danger size="small" icon={<CloseOutlined />}>Reject</Button>
              </Popconfirm>
            </>
          )}
          {r.status === 'APPROVED' && (
            <Popconfirm title="Suspend this merchant?" onConfirm={() => handleSuspend(r.id, true)}>
              <Button size="small" icon={<StopOutlined />}>Suspend</Button>
            </Popconfirm>
          )}
          {r.status === 'SUSPENDED' && (
            <Popconfirm title="Reactivate this merchant?" onConfirm={() => handleSuspend(r.id, false)}>
              <Button size="small" type="primary" icon={<PlayCircleOutlined />}>Reactivate</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Merchants</Typography.Title>
      <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); setPage(1); fetchMerchants(key, 1) }} style={{ marginBottom: 16 }} items={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))} />
      <Table rowKey="id" columns={columns} dataSource={merchants} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchMerchants(activeTab, p) } }} />

      <Drawer title="Merchant Detail" open={!!selected} onClose={() => setSelected(null)} width={480}>
        {selected && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Store Name">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Owner">{selected.owner?.phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Region">{selected.region?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Commission">{(parseFloat(selected.commissionRate || '0.05') * 100).toFixed(0)}%</Descriptions.Item>
              <Descriptions.Item label="Applied">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              {selected.approvedAt && <Descriptions.Item label="Approved">{dayjs(selected.approvedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
              {selected.rejectionNote && <Descriptions.Item label="Rejection Note">{selected.rejectionNote}</Descriptions.Item>}
              {selected.description && <Descriptions.Item label="Description">{selected.description}</Descriptions.Item>}
            </Descriptions>
            {selected.status === 'PENDING' && (
              <div style={{ marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input.TextArea rows={2} placeholder="Rejection note (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
                  <Space>
                    <Popconfirm title="Approve?" onConfirm={() => handleApprove(selected.id)}><Button type="primary" icon={<CheckOutlined />}>Approve</Button></Popconfirm>
                    <Popconfirm title="Reject?" onConfirm={() => handleReject(selected.id)}><Button danger icon={<CloseOutlined />}>Reject</Button></Popconfirm>
                  </Space>
                </Space>
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Space>
                {selected.status === 'APPROVED' && (
                  <Popconfirm title="Suspend this merchant?" onConfirm={() => handleSuspend(selected.id, true)}>
                    <Button icon={<StopOutlined />}>Suspend</Button>
                  </Popconfirm>
                )}
                {selected.status === 'SUSPENDED' && (
                  <Popconfirm title="Reactivate?" onConfirm={() => handleSuspend(selected.id, false)}>
                    <Button type="primary" icon={<PlayCircleOutlined />}>Reactivate</Button>
                  </Popconfirm>
                )}
              </Space>
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
