import { useEffect, useState } from 'react'
import { Table, Tag, Typography, Input, Button, Space, Drawer, Descriptions } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', PROCESSING: 'blue', SHIPPED: 'purple', DELIVERED: 'cyan', COMPLETED: 'green', CANCELLED: 'default',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  const fetchOrders = async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res: any = await api.getAdminOrders({ page: p, limit: 20, search: q || undefined })
      setOrders(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch { setOrders([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [])

  const columns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', render: (v: string) => `#${v.slice(-8).toUpperCase()}`, width: 130 },
    { title: 'User', key: 'user', render: (_: any, r: any) => r.user?.phone || '-' },
    { title: 'Merchant', key: 'merchant', render: (_: any, r: any) => r.merchant?.name || '-' },
    {
      title: 'Status', dataIndex: 'status', key: 'status', width: 130,
      render: (v: string) => <Tag color={ORDER_STATUS_COLOR[v] ?? 'default'}>{(v ?? '').replace(/_/g, ' ')}</Tag>,
    },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}`, width: 120 },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD'), width: 120 },
    { title: 'Actions', key: 'actions', render: (_: any, r: any) => <Button type="link" size="small" onClick={() => setSelected(r)}>View</Button> },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Orders</Typography.Title>
      <Space style={{ marginBottom: 16 }}>
        <Input placeholder="Search order ID or user phone" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => fetchOrders(1, search)} style={{ width: 300 }} />
        <Button type="primary" onClick={() => fetchOrders(1, search)}>Search</Button>
      </Space>
      <Table rowKey="id" columns={columns} dataSource={orders} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchOrders(p, search) } }} />

      <Drawer title="Order Detail" open={!!selected} onClose={() => setSelected(null)} width={520}>
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="Order ID">#{selected.id.slice(-8).toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="User">{selected.user?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Merchant">{selected.merchant?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={ORDER_STATUS_COLOR[selected.status]}>{(selected.status ?? '').replace(/_/g, ' ')}</Tag></Descriptions.Item>
            <Descriptions.Item label="Total">¥{(Number(selected.totalAmount) / 100).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="Wallet">{selected.walletType || '-'}</Descriptions.Item>
            <Descriptions.Item label="Remark">{selected.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Items">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {selected.items?.map((it: any) => (
                  <li key={it.id}>{it.productName} x{it.quantity} — ¥{(Number(it.subtotal) / 100).toFixed(2)}</li>
                ))}
              </ul>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
