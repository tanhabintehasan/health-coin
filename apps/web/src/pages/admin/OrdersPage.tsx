import { useEffect, useState } from 'react'
import { Table, Tag, Typography, Input, Button, Space, Drawer, Descriptions, Modal, Select, message } from 'antd'
import { SearchOutlined, UndoOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'
import { useResponsive } from '../../hooks/useResponsive'

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange', PAID: 'blue', PROCESSING: 'blue', SHIPPED: 'purple', DELIVERED: 'cyan', COMPLETED: 'green', CANCELLED: 'default',
  REFUNDING: 'red', REFUNDED: 'default',
}

export default function OrdersPage() {
  const { isMobile } = useResponsive()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [refundModalOpen, setRefundModalOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')

  const fetchOrders = async (p = 1, q = '') => {
    setLoading(true)
    try {
      const res: any = await api.getAdminOrders({ page: p, limit: 20, search: q || undefined })
      setOrders(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch { setOrders([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchOrders() }, [])

  const handleRefund = async () => {
    if (!selected) return
    try {
      await api.forceOrderStatus(selected.id, 'REFUNDING')
      message.success('已标记为退款中')
      setRefundModalOpen(false)
      setSelected(null)
      fetchOrders(page, search)
    } catch (err: any) {
      message.error(err || '操作失败')
    }
  }

  const handleStatusChange = async () => {
    if (!selected || !newStatus) return
    try {
      await api.forceOrderStatus(selected.id, newStatus)
      message.success('状态已更新')
      setStatusModalOpen(false)
      setSelected(null)
      fetchOrders(page, search)
    } catch (err: any) {
      message.error(err || '操作失败')
    }
  }

  const columns = [
    { title: '订单号', dataIndex: 'id', key: 'id', render: (v: string) => `#${v.slice(-8).toUpperCase()}`, width: 130 },
    { title: '用户', key: 'user', render: (_: any, r: any) => r.user?.phone || '-' },
    { title: '商户', key: 'merchant', render: (_: any, r: any) => r.merchant?.name || '-' },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 130,
      render: (v: string) => <Tag color={ORDER_STATUS_COLOR[v] ?? 'default'}>{(v ?? '').replace(/_/g, ' ')}</Tag>,
    },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}`, width: 120 },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD'), width: 120 },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => setSelected(r)}>查看</Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>订单监控</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input placeholder="搜索订单号或用户手机号" prefix={<SearchOutlined />} value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => fetchOrders(1, search)} style={{ width: isMobile ? '100%' : 300 }} />
        <Button type="primary" onClick={() => fetchOrders(1, search)}>搜索</Button>
      </Space>
      <div className="table-responsive">
        <Table rowKey="id" columns={columns} dataSource={orders} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchOrders(p, search) } }} scroll={{ x: 'max-content' }} />
      </div>

      <Drawer
        title="订单详情"
        open={!!selected}
        onClose={() => setSelected(null)}
        width={isMobile ? '100%' : 560}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
        extra={
          <Space wrap>
            <Button icon={<UndoOutlined />} onClick={() => setRefundModalOpen(true)} disabled={selected && ['CANCELLED', 'REFUNDED', 'REFUNDING'].includes(selected.status)}>发起退款</Button>
            <Button type="primary" onClick={() => { setNewStatus(selected?.status || ''); setStatusModalOpen(true) }}>修改状态</Button>
          </Space>
        }
      >
        {selected && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="订单号">#{selected.id.slice(-8).toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="用户">{selected.user?.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="商户">{selected.merchant?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={ORDER_STATUS_COLOR[selected.status]}>{(selected.status ?? '').replace(/_/g, ' ')}</Tag></Descriptions.Item>
            <Descriptions.Item label="总金额">¥{(Number(selected.totalAmount) / 100).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="支付方式">{selected.walletType || '现金/聚合支付'}</Descriptions.Item>
            <Descriptions.Item label="备注">{selected.remark || '-'}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="商品明细">
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {selected.items?.map((it: any) => (
                  <li key={it.id}>{it.productName} x{it.quantity} — ¥{(Number(it.subtotal) / 100).toFixed(2)}</li>
                ))}
              </ul>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        open={refundModalOpen}
        title="发起退款 / 售后"
        onCancel={() => setRefundModalOpen(false)}
        onOk={handleRefund}
        okText="确认标记退款中"
        cancelText="取消"
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <p>将此订单标记为 <Tag color="red">退款中</Tag>，并通知相关商户与用户处理退款。</p>
        <Input.TextArea
          placeholder="请输入退款/售后原因（可选）"
          value={refundReason}
          onChange={(e) => setRefundReason(e.target.value)}
          rows={3}
        />
      </Modal>

      <Modal
        open={statusModalOpen}
        title="强制修改订单状态"
        onCancel={() => setStatusModalOpen(false)}
        onOk={handleStatusChange}
        okText="保存"
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        <Select style={{ width: '100%' }} value={newStatus} onChange={(v) => setNewStatus(v)}>
          {['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'REFUNDING', 'REFUNDED'].map((s) => (
            <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  )
}
