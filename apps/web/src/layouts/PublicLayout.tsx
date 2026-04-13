import { Layout, Menu, Button, Space, Typography, Row, Col, Divider, Drawer } from 'antd'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import { MedicineBoxOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, MenuOutlined } from '@ant-design/icons'
import { useResponsive } from '../hooks/useResponsive'

const { Header, Content, Footer } = Layout
const { Title, Text } = Typography

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { isMobile } = useResponsive()

  const menuItems = [
    { key: '/', label: <Link to="/">首页</Link> },
    { key: '/shop', label: <Link to="/shop">商城</Link> },
    { key: '/merchant-join', label: <Link to="/merchant-join">商户入驻</Link> },
    { key: '/about', label: <Link to="/about">关于我们</Link> },
    { key: '/contact', label: <Link to="/contact">联系我们</Link> },
  ]

  const selectedKey = menuItems.find((i) => location.pathname === (i as any).key)?.key || '/'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,.06)', position: 'sticky', top: 0, zIndex: 50 }}>
        {/* Logo on the left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <MedicineBoxOutlined style={{ fontSize: 28, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0, color: '#1677ff', whiteSpace: 'nowrap' }}>HealthCoin</Title>
        </div>

        {/* Desktop: horizontal menu */}
        {!isMobile && (
          <Menu mode="horizontal" selectedKeys={[selectedKey]} items={menuItems} style={{ flex: 1, justifyContent: 'center', border: 'none', maxWidth: 600 }} />
        )}

        {/* Desktop: auth buttons */}
        {!isMobile && (
          <Space>
            {token ? (
              <Button type="primary" onClick={() => navigate('/portal/user/home')}>进入平台</Button>
            ) : (
              <>
                <Button type="default" onClick={() => navigate('/login')}>登录</Button>
                <Button type="primary" onClick={() => navigate('/register')}>注册</Button>
              </>
            )}
          </Space>
        )}

        {/* Mobile: hamburger on the right */}
        {isMobile && (
          <Button type="text" icon={<MenuOutlined style={{ fontSize: 20 }} />} onClick={() => setDrawerOpen(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }} />
        )}
      </Header>

      <Drawer
        title="导航"
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={260}
      >
        <Menu mode="vertical" selectedKeys={[selectedKey]} items={menuItems} onClick={() => setDrawerOpen(false)} />
        <Divider />
        <div style={{ padding: '0 16px' }}>
          {token ? (
            <Button type="primary" block onClick={() => { navigate('/portal/user/home'); setDrawerOpen(false); }}>进入平台</Button>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="default" block onClick={() => { navigate('/login'); setDrawerOpen(false); }}>登录</Button>
              <Button type="primary" block onClick={() => { navigate('/register'); setDrawerOpen(false); }}>注册</Button>
            </Space>
          )}
        </div>
      </Drawer>

      <Content>{children}</Content>

      <Footer style={{ background: '#001529', color: '#fff', padding: '48px 24px 24px' }}>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <Title level={4} style={{ color: '#fff' }}>HealthCoin</Title>
            <Text style={{ color: 'rgba(255,255,255,0.65)' }}>
              中国领先的健康积分电商平台，连接健康消费与数字资产，让每一次健康消费都更有价值。
            </Text>
          </Col>
          <Col xs={24} md={8}>
            <Title level={5} style={{ color: '#fff' }}>快速入口</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Link to="/shop" style={{ color: 'rgba(255,255,255,0.65)' }}>积分商城</Link>
              <Link to="/merchant-join" style={{ color: 'rgba(255,255,255,0.65)' }}>商户入驻</Link>
              <Link to="/about" style={{ color: 'rgba(255,255,255,0.65)' }}>关于我们</Link>
              <Link to="/contact" style={{ color: 'rgba(255,255,255,0.65)' }}>联系我们</Link>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <Title level={5} style={{ color: '#fff' }}>联系方式</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}><PhoneOutlined /> 400-888-6666</div>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}><MailOutlined /> support@healthcoin.cn</div>
              <div style={{ color: 'rgba(255,255,255,0.65)' }}><EnvironmentOutlined /> 上海市浦东新区张江高科技园区</div>
            </div>
          </Col>
        </Row>
        <Divider style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)' }}>
          © {new Date().getFullYear()} HealthCoin 健康币平台 版权所有
        </div>
      </Footer>
    </Layout>
  )
}
