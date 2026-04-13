import { useEffect, useState } from 'react'
import { Card, Table, Tag, Select, Space, Typography, Drawer, Descriptions, Button, message, Divider } from 'antd'
import dayjs from 'dayjs'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography

const ALL_STATUSES = ['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED']

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', PROCESSING: 'blue', SHIPPED: 'purple', COMPLETED: 'green', CANCELLED: 'default', REFUNDING: 'red', REFUNDED: 'default',
}

const NEXT_STATUS: Record<string, string> = {
  PAID: 'PROCESSING', PROCESSING: 'SHIPPED', SHIPPED: 'COMPLETED',
}

export default function OrdersPage() {
  const { isMobile } = useResponsive()
  const [orders, setOrders] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [advancing, setAdvancing] = useState(false)

  const fetchOrders = async (p = 1, status?: string) => {
    setLoading(true)
    try {
      const params: any = { page: p, limit: 10 }
      if (status) params.status = status
      const res: any = await api.getMerchantOrders(params)
      setOrders(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders(page, statusFilter) }, [page, statusFilter])

  const advanceStatus = async () => {
    if (!selected || !NEXT_STATUS[selected.status]) return
    setAdvancing(true)
    try {
      await api.updateOrderStatus(selected.id, NEXT_STATUS[selected.status])
      message.success('Order status updated')
      const updated = { ...selected, status: NEXT_STATUS[selected.status] }
      setSelected(updated)
      fetchOrders(page, statusFilter)
    } catch (err: any) {
      message.error(err || 'Failed to update status')
    } finally { setAdvancing(false) }
  }

  const columns = [
    { title: 'Order ID', dataIndex: 'id', key: 'id', width: 130, render: (v: string) => <Button type="link" style={{ padding: 0 }} onClick={() => setSelected(orders.find((o) => o.id === v))}>#{v.slice(-8).toUpperCase()}</Button> },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 140, render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v.replace(/_/g, ' ')}</Tag> },
    { title: 'Items', dataIndex: 'items', key: 'items', render: (items: any[]) => `${items?.length ?? 0} item(s)` },
    { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', width: 110, render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}` },
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Orders</Title>
        <Select placeholder="Filter by status" allowClear style={{ width: 180 }} onChange={(v) => { setStatusFilter(v); setPage(1) }} options={ALL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))} />
      </div>
      <Card>
        <div className="table-responsive">
          <Table dataSource={orders} columns={columns} rowKey="id" loading={loading} pagination={{ total, pageSize: 10, current: page, onChange: (p) => setPage(p) }} scroll={{ x: 'max-content' }} />
        </div>
      </Card>
      <Drawer title={`Order #${selected?.id?.slice(-8).toUpperCase() ?? ''}`} open={!!selected} onClose={() => setSelected(null)} width={isMobile ? '90%' : 480} style={{ maxWidth: '100vw' }}
        extra={NEXT_STATUS[selected?.status] && <Button type="primary" loading={advancing} onClick={advanceStatus}>Mark as {NEXT_STATUS[selected?.status]?.replace(/_/g, ' ')}</Button>}
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <Tag color={STATUS_COLOR[selected.status] ?? 'default'} style={{ fontSize: 14, padding: '4px 12px' }}>{selected.status.replace(/_/g, ' ')}</Tag>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Created">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              {selected.paidAt && <Descriptions.Item label="Paid">{dayjs(selected.paidAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>}
              {selected.deliveryAddress && <Descriptions.Item label="Address">{selected.deliveryAddress}</Descriptions.Item>}
              {selected.note && <Descriptions.Item label="Note">{selected.note}</Descriptions.Item>}
            </Descriptions>
            <div>
              <Text strong>Items</Text>
              <Divider style={{ margin: '8px 0' }} />
              {selected.items?.map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div><Text>{item.productName}</Text><br /><Text type="secondary" style={{ fontSize: 12 }}>{item.variantName} × {item.quantity}</Text>{item.redemptionCode && <div><Text code style={{ fontSize: 12 }}>{item.redemptionCode}</Text></div>}</div>
                  <Text strong>¥{(Number(item.unitPrice) * item.quantity / 100).toFixed(2)}</Text>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8 }}>
                <Text strong>Total</Text>
                <Text strong style={{ color: '#1677ff' }}>¥{(Number(selected.totalAmount) / 100).toFixed(2)}</Text>
              </div>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  )
}
