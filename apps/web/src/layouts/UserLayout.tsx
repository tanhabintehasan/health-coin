import { Layout, Menu, theme, Avatar, Dropdown, Space, Typography, Badge, type MenuProps } from 'antd'
import {
  HomeOutlined,
  ShoppingCartOutlined,
  UnorderedListOutlined,
  WalletOutlined,
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { Suspense, useEffect, useState } from 'react'
import { LoadingFallback } from '../components/common/LoadingFallback'
import { api } from '../services/api'

const { Header, Content, Footer } = Layout
const { Title, Text } = Typography

export default function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [cartCount, setCartCount] = useState(0)

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  useEffect(() => {
    api.getCart().then((c) => {
      const count = (c?.items || []).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0)
      setCartCount(count)
    }).catch(() => {})
  }, [location.pathname])

  const selected = location.pathname.split('/').pop() || 'home'

  const items = [
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/portal/user/home">Home</Link> },
    { key: 'cart', icon: <Badge count={cartCount} showZero><ShoppingCartOutlined /></Badge>, label: <Link to="/portal/user/cart">Cart</Link> },
    { key: 'orders', icon: <UnorderedListOutlined />, label: <Link to="/portal/user/orders">Orders</Link> },
    { key: 'wallet', icon: <WalletOutlined />, label: <Link to="/portal/user/wallet">Wallet</Link> },
    { key: 'referral', icon: <TeamOutlined />, label: <Link to="/portal/user/referral">Referral</Link> },
    { key: 'health', icon: <MedicineBoxOutlined />, label: <Link to="/portal/user/health">Health</Link> },
    { key: 'profile', icon: <UserOutlined />, label: <Link to="/portal/user/profile">Profile</Link> },
  ]

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: 'Profile', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: () => { logout(); navigate('/login') } },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Title level={4} style={{ margin: 0 }}>HealthCoin</Title>
        <Menu mode="horizontal" selectedKeys={[selected]} items={items} style={{ flex: 1, justifyContent: 'flex-end', border: 'none' }} />
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Space style={{ marginLeft: 16, cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <Text>{user?.nickname || user?.phone || 'User'}</Text>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: colorBgContainer, borderRadius: borderRadiusLG, padding: 24, minHeight: 600 }}>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>HealthCoin ©{new Date().getFullYear()}</Footer>
    </Layout>
  )
}
