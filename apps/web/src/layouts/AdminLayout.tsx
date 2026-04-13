import { Layout, Menu, theme, Avatar, Dropdown, Space, Typography, type MenuProps } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  ShopOutlined,
  ShoppingOutlined,
  UnorderedListOutlined,
  CreditCardOutlined,
  CrownOutlined,
  SettingOutlined,
  GiftOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { Suspense } from 'react'
import { LoadingFallback } from '../components/common/LoadingFallback'

const { Sider, Content, Header } = Layout
const { Title } = Typography

const items = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/portal/admin/dashboard">Dashboard</Link> },
  { key: 'users', icon: <UserOutlined />, label: <Link to="/portal/admin/users">Users</Link> },
  { key: 'merchants', icon: <ShopOutlined />, label: <Link to="/portal/admin/merchants">Merchants</Link> },
  { key: 'products', icon: <ShoppingOutlined />, label: <Link to="/portal/admin/products">Products Review</Link> },
  { key: 'orders', icon: <UnorderedListOutlined />, label: <Link to="/portal/admin/orders">Orders</Link> },
  { key: 'withdrawals', icon: <CreditCardOutlined />, label: <Link to="/portal/admin/withdrawals">Withdrawals</Link> },
  { key: 'membership', icon: <CrownOutlined />, label: <Link to="/portal/admin/membership">Membership</Link> },
  { key: 'redemption', icon: <GiftOutlined />, label: <Link to="/portal/admin/redemption">Redemption</Link> },
  { key: 'settings', icon: <SettingOutlined />, label: <Link to="/portal/admin/settings">Settings</Link> },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selected = location.pathname.split('/').pop() || 'dashboard'

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: 'Profile', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', onClick: () => { logout(); navigate('/login') } },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="light">
        <div style={{ padding: 16 }}>
          <Title level={4} style={{ margin: 0 }}>HealthCoin Admin</Title>
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span />
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nickname || user?.phone || 'Admin'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
