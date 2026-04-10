import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin } from 'antd'
import {
  ShoppingOutlined,
  WalletOutlined,
  PayCircleOutlined,
  DollarOutlined,
  RiseOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import client from '../../api/client'
import dayjs from 'dayjs'

const STAT_CARD_STYLES: Record<string, React.CSSProperties> = {
  orders: { borderLeft: '4px solid #1677ff' },
  revenue: { borderLeft: '4px solid #52c41a' },
  withdrawals: { borderLeft: '4px solid #f5222d' },
  paidOut: { borderLeft: '4px solid #fa8c16' },
  mutual: { borderLeft: '4px solid #722ed1' },
  universal: { borderLeft: '4px solid #13c2c2' },
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange',
  PAID: 'blue',
  PROCESSING: 'blue',
  SHIPPED: 'purple',
  DELIVERED: 'cyan',
  COMPLETED: 'green',
  CANCELLED: 'default',
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/withdrawals/admin/finance-summary'),
      client.get('/orders/admin?limit=5&page=1'),
    ])
      .then(([summaryRes, ordersRes]: any[]) => {
        setSummary(summaryRes.data)
        setRecentOrders(ordersRes.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const orderColumns = [
    {
      title: 'Order ID',
      dataIndex: 'id',
      key: 'id',
      render: (v: string) => `#${v.slice(-8).toUpperCase()}`,
      width: 130,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={ORDER_STATUS_COLOR[v] ?? 'default'}>{(v ?? '').replace(/_/g, ' ')}</Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}`,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>Dashboard</Typography.Title>

      <Card
        title={
          <span>
            <RiseOutlined style={{ marginRight: 8, color: '#1677ff' }} />
            Platform Overview
          </span>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.orders} bordered={false} styles={{ body: { background: '#f6f9ff', borderRadius: 6 } }}>
              <Statistic
                title="Completed Orders"
                value={summary?.totalCompletedOrders ?? 0}
                prefix={<ShoppingOutlined style={{ color: '#1677ff' }} />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.revenue} bordered={false} styles={{ body: { background: '#f6fff6', borderRadius: 6 } }}>
              <Statistic
                title="Total Revenue (coins)"
                value={summary?.totalRevenue ?? '0'}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
                suffix="HC"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.withdrawals} bordered={false} styles={{ body: { background: '#fff6f6', borderRadius: 6 } }}>
              <Statistic
                title="Pending Withdrawals"
                value={summary?.pendingWithdrawals ?? 0}
                prefix={<WalletOutlined style={{ color: summary?.pendingWithdrawals > 0 ? '#f5222d' : '#999' }} />}
                valueStyle={{ color: summary?.pendingWithdrawals > 0 ? '#f5222d' : '#333' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.paidOut} bordered={false} styles={{ body: { background: '#fffbf0', borderRadius: 6 } }}>
              <Statistic
                title="Total Paid Out (coins)"
                value={summary?.totalPaidOut ?? '0'}
                prefix={<PayCircleOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
                suffix="HC"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.mutual} bordered={false} styles={{ body: { background: '#faf0ff', borderRadius: 6 } }}>
              <Statistic
                title="Mutual Coins Issued"
                value={summary?.totalMutualCoinsIssued ?? '0'}
                prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
                suffix="units"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.universal} bordered={false} styles={{ body: { background: '#f0fffe', borderRadius: 6 } }}>
              <Statistic
                title="Universal Coins Issued"
                value={summary?.totalUniversalCoinsIssued ?? '0'}
                prefix={<DollarOutlined style={{ color: '#13c2c2' }} />}
                valueStyle={{ color: '#13c2c2' }}
                suffix="units"
              />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="Recent Activity">
        <Table
          dataSource={recentOrders}
          columns={orderColumns}
          rowKey="id"
          pagination={false}
          size="small"
          locale={{ emptyText: 'No recent orders' }}
        />
      </Card>
    </div>
  )
}
