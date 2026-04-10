import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Table, Tag, Typography, Space, Alert, Button } from 'antd'
import {
  ShoppingCartOutlined,
  DollarOutlined,
  QrcodeOutlined,
  ShoppingOutlined,
  ShopOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuthStore } from '../../store/auth.store'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange',
  PAID: 'blue',
  PROCESSING: 'blue',
  SHIPPED: 'purple',
  DELIVERED: 'cyan',
  COMPLETED: 'green',
  CANCELLED: 'default',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { merchant } = useAuthStore()
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, redemptions: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [ordersRes, productsRes, redemptionsRes] = await Promise.all([
          api.getMerchantOrders({ limit: 5, page: 1 }),
          api.getMerchantProducts({ limit: 1 }),
          api.getRedemptionLogs({ limit: 1 }),
        ])

        const orders: any[] = ordersRes?.data ?? []
        setRecentOrders(orders)

        const revenue = orders.reduce((sum: number, o: any) => sum + Number(o.totalAmount ?? 0), 0)
        setStats({
          orders: ordersRes?.meta?.total ?? orders.length,
          revenue,
          products: productsRes?.meta?.total ?? 0,
          redemptions: redemptionsRes?.meta?.total ?? 0,
        })
      } catch {} finally { setLoading(false) }
    }
    fetchData()
  }, [])

  const orderColumns = [
    { title: 'Order', dataIndex: 'id', key: 'id', render: (v: string) => `#${v.slice(-8).toUpperCase()}`, width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{(v ?? '').replace(/_/g, ' ')}</Tag>,
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

  if (merchant?.status === 'PENDING') {
    return (
      <div>
        <Alert
          type="warning"
          showIcon
          message="Application Under Review"
          description="Your merchant application is being reviewed. You'll be notified once approved."
          style={{ marginBottom: 24 }}
        />
        <Card>
          <Space direction="vertical">
            <Title level={4}>While you wait...</Title>
            <Text type="secondary">Make sure your store information is complete.</Text>
          </Space>
        </Card>
      </div>
    )
  }

  if (!merchant) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <Space direction="vertical" size={16}>
          <ShopOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Title level={3}>Become a Merchant</Title>
          <Text type="secondary">Apply to start selling on HealthCoin Platform</Text>
          <Button type="primary" size="large" onClick={() => navigate('/apply')}>
            Apply Now
          </Button>
        </Space>
      </Card>
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard — {merchant?.name}
      </Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ background: 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)', color: '#fff', borderRadius: 12 }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}><ShoppingCartOutlined style={{ marginRight: 6 }} />Total Orders</span>}
              value={stats.orders}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', color: '#fff', borderRadius: 12 }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}><DollarOutlined style={{ marginRight: 6 }} />Revenue (Recent)</span>}
              value={(stats.revenue / 100).toFixed(2)}
              suffix="¥"
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)', color: '#fff', borderRadius: 12 }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}><ShoppingOutlined style={{ marginRight: 6 }} />Products</span>}
              value={stats.products}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            bordered={false}
            style={{ background: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)', color: '#fff', borderRadius: 12 }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.85)' }}><QrcodeOutlined style={{ marginRight: 6 }} />Redemptions</span>}
              value={stats.redemptions}
              valueStyle={{ color: '#fff', fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card title="Quick Actions" style={{ height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                block
                onClick={() => navigate('/products/new')}
              >
                New Product
              </Button>
              <Button
                icon={<UnorderedListOutlined />}
                block
                onClick={() => navigate('/orders')}
              >
                View Orders
              </Button>
              <Button
                icon={<ScanOutlined />}
                block
                onClick={() => navigate('/redemption')}
              >
                Scan Code
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Recent Orders" extra={<Button type="link" onClick={() => navigate('/orders')}>View All</Button>}>
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              pagination={false}
              loading={loading}
              size="small"
              locale={{ emptyText: 'No recent orders' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
