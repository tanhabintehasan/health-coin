import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Avatar, Typography, Space, Tag, message } from 'antd'
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  QrcodeOutlined,
  LogoutOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/auth.store'
import { api } from '../services/api'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'orange',
  APPROVED: 'green',
  REJECTED: 'red',
  SUSPENDED: 'red',
}

export default function MerchantLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, merchant, setMerchant, clearAuth } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    api.getMyMerchant()
      .then((m: any) => setMerchant(m))
      .catch(() => {})
  }, [])

  const selectedKey = location.pathname.replace('/', '') || 'dashboard'

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'products', icon: <ShoppingOutlined />, label: 'Products' },
    { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Orders' },
    { key: 'redemption', icon: <QrcodeOutlined />, label: 'Redemption' },
  ]

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={220}>
        <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
          <Space align="center">
            <ShopOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            {!collapsed && (
              <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                Merchant Hub
              </Text>
            )}
          </Space>
        </div>
        {merchant && !collapsed && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <Text ellipsis style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{merchant.name}</Text>
            <Tag color={STATUS_COLOR[merchant.status] ?? 'default'} style={{ marginTop: 4, fontSize: 11 }}>
              {merchant.status}
            </Tag>
          </div>
        )}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(`/${key}`)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderBottom: '1px solid #f0f0f0' }}>
          <Space>
            <Avatar style={{ background: '#1677ff' }}>
              {user?.phone?.slice(-4) ?? 'M'}
            </Avatar>
            <Text style={{ fontSize: 13 }}>{user?.phone}</Text>
            <Button icon={<LogoutOutlined />} type="text" onClick={logout} danger>
              Logout
            </Button>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
