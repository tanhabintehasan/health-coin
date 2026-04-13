import { Button, Typography, Space, Card, Row, Col } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  SafetyOutlined,
  ShopOutlined,
  UserOutlined,
  MedicineBoxOutlined,
} from '@ant-design/icons'

const { Title, Text } = Typography

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
        <Title style={{ color: '#fff', fontSize: 40, marginBottom: 16 }}>HealthCoin</Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, display: 'block', maxWidth: 640, margin: '0 auto 32px' }}>
          A unified health & wellness platform connecting users, merchants, and administrators.
        </Text>
        <Button type="primary" size="large" style={{ background: '#fff', color: '#1677ff', borderColor: '#fff' }} onClick={() => navigate('/login')}>
          Get Started — Login
        </Button>
      </div>

      {/* Features */}
      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }}>
              <UserOutlined style={{ fontSize: 40, color: '#1677ff', marginBottom: 16 }} />
              <Title level={4}>User App</Title>
              <Text type="secondary">Shop health products, manage wallets, track orders, upload health records, and earn referral rewards.</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }}>
              <ShopOutlined style={{ fontSize: 40, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>Merchant Portal</Title>
              <Text type="secondary">Manage products, process orders, and scan redemption codes — all in one place.</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12 }}>
              <SafetyOutlined style={{ fontSize: 40, color: '#722ed1', marginBottom: 16 }} />
              <Title level={4}>Admin Portal</Title>
              <Text type="secondary">Oversee users, merchants, orders, withdrawals, product reviews, and platform settings.</Text>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Footer hint */}
      <div style={{ textAlign: 'center', padding: '40px 24px', background: '#f5f5f5' }}>
        <Space direction="vertical" size={8}>
          <Text type="secondary">Demo logins available on the login page for staging.</Text>
          <MedicineBoxOutlined style={{ fontSize: 24, color: '#bbb' }} />
        </Space>
      </div>
    </div>
  )
}
