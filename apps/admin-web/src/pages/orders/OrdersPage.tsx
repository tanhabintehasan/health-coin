import { useEffect, useState } from 'react'
import { Table, Tag, Select, Typography, Space, Button, Modal, message } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import client from '../../api/client'
import dayjs from 'dayjs'

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', PROCESSING: 'cyan',
  SHIPPED: 'geekblue', COMPLETED: 'success', CANCELLED: 'default',
  REFUNDING: 'warning', REFUNDED: 'purple',
}

const ALL_STATUSES = [
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED',
  'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED',
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string | undefined>()
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [forceTarget, setForceTarget] = useState<any>(null)
  const [forceStatus, setForceStatus] = useState<string>('')
  const [forcing, setForcing] = useState(false)

  const fetchOrders = async (p = 1, s?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (s) params.set('status', s)
      const res: any = await client.get(`/admin/orders?${params}`)
      setOrders(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [])

  const handleForceStatus = async () => {
    if (!forceStatus) return
    setForcing(true)
    try {
      await client.patch(`/admin/orders/${forceTarget.id}/status`, { status: forceStatus })
      message.success(`Order status changed to ${forceStatus}`)
      setForceTarget(null)
      fetchOrders(page, status)
    } catch {
      message.error('Failed to change status')
    } finally { setForcing(false) }
  }

  const columns = [
    { title: 'Order No', dataIndex: 'orderNo', key: 'orderNo', width: 160 },
    { title: 'User', key: 'user', render: (_: any, r: any) => r.user?.phone || '-' },
    { title: 'Merchant', key: 'merchant', render: (_: any, r: any) => r.merchant?.name || '-', ellipsis: true },
    { title: 'Amount', dataIndex: 'totalAmount', key: 'totalAmount', width: 100, render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}` },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (v: string) => <Tag color={STATUS_COLORS[v] ?? 'default'}>{v.replace(/_/g, ' ')}</Tag>,
    },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 130, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
    {
      title: 'Actions', key: 'actions', width: 120,
      render: (_: any, r: any) => (
        <Button
          size="small"
          icon={<SettingOutlined />}
          onClick={() => { setForceTarget(r); setForceStatus(r.status) }}
        >
          Change Status
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Orders</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Filter by status"
          allowClear
          style={{ width: 200 }}
          onChange={(v) => { setStatus(v); fetchOrders(1, v) }}
          options={ALL_STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s }))}
        />
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchOrders(p, status) } }}
      />

      <Modal
        title={`Change Order Status — #${forceTarget?.orderNo}`}
        open={!!forceTarget}
        onOk={handleForceStatus}
        onCancel={() => setForceTarget(null)}
        confirmLoading={forcing}
        okText="Apply"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Current status: <Tag color={STATUS_COLORS[forceTarget?.status]}>{forceTarget?.status}</Tag>
          </Typography.Text>
          <Select
            value={forceStatus}
            onChange={setForceStatus}
            style={{ width: '100%' }}
            options={ALL_STATUSES.map((s) => ({ label: s.replace(/_/g, ' '), value: s }))}
          />
          <Typography.Text type="danger" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            Warning: This bypasses normal state machine rules. Use only for anomalous orders.
          </Typography.Text>
        </div>
      </Modal>
    </div>
  )
}
