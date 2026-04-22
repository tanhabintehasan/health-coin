import { useEffect, useState } from 'react'
import { Table, Tag, Spin, Empty, message } from 'antd'
import { api } from '../../services/api'

export default function RefundsPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    api.getAdminOrders({ status: 'REFUNDING', limit: 50 })
      .then((res: any) => setOrders(res?.data || []))
      .catch((err) => { console.error(err); message.error('Failed to load refund orders'); setOrders([]) })
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { title: '订单号', dataIndex: 'orderNo', key: 'orderNo' },
    { title: '用户', dataIndex: ['user', 'phone'], key: 'user' },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: number) => `¥${(v / 100).toFixed(2)}` },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt' },
  ]

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  return (
    <div>
      <h2>退款管理</h2>
      {orders.length === 0 ? (
        <Empty description="暂无退款订单" style={{ marginTop: 80 }} />
      ) : (
        <div className="table-responsive">
          <Table dataSource={orders} columns={columns} rowKey="id" style={{ marginTop: 24 }} scroll={{ x: 'max-content' }} />
        </div>
      )}
    </div>
  )
}
