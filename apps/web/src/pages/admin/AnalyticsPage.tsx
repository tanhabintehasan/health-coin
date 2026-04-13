import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin } from 'antd'
import { RiseOutlined, ShoppingOutlined, UserOutlined, DollarOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0, growth: 0 })

  useEffect(() => {
    Promise.all([
      api.getAdminUsers({ limit: 1 }),
      api.getAdminOrders({ limit: 1 }),
    ])
      .then(([usersRes, ordersRes]) => {
        setStats({
          users: usersRes?.meta?.total || 0,
          orders: ordersRes?.meta?.total || 0,
          revenue: 0,
          growth: 0,
        })
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  }

  return (
    <div>
      <h2>运营分析</h2>
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总用户数" value={stats.users} prefix={<UserOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总订单数" value={stats.orders} prefix={<ShoppingOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="总营收" value={stats.revenue} prefix={<DollarOutlined />} suffix="元" />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="月增长率" value={stats.growth} prefix={<RiseOutlined />} suffix="%" />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
