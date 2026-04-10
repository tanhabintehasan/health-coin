import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Avatar, Typography, Space } from 'antd'
import {
  DashboardOutlined, UserOutlined, ShopOutlined, ShoppingOutlined,
  WalletOutlined, CrownOutlined, SettingOutlined, LogoutOutlined,
  AuditOutlined, ScanOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/auth.store'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const menuItems = [
  { key: '/dashboard',   icon: <DashboardOutlined />,  label: 'Dashboard' },
  { key: '/users',       icon: <UserOutlined />,        label: 'Users' },
  { key: '/merchants',   icon: <ShopOutlined />,        label: 'Merchants' },
  { key: '/orders',      icon: <ShoppingOutlined />,    label: 'Orders' },
  { key: '/withdrawals', icon: <WalletOutlined />,      label: 'Withdrawals' },
  { key: '/membership',  icon: <CrownOutlined />,       label: 'Membership' },
  { key: '/products/review', icon: <AuditOutlined />,    label: 'Product Review' },
  { key: '/redemption',  icon: <ScanOutlined />,        label: 'Redemption Logs' },
  { key: '/settings',    icon: <SettingOutlined />,     label: 'Settings' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} theme="dark">
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #303030' }}>
          <Text strong style={{ color: '#fff', fontSize: 16 }}>
            HealthCoin Admin
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <Space>
            <Avatar icon={<UserOutlined />} />
            <Text>Admin</Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => { logout(); navigate('/login') }}
            >
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24, background: '#f5f5f5', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
