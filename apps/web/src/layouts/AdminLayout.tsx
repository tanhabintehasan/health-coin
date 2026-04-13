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
  AppstoreOutlined,
  PercentageOutlined,
  BarChartOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'
import { Suspense } from 'react'
import { LoadingFallback } from '../components/common/LoadingFallback'
import { useResponsive } from '../hooks/useResponsive'

const { Sider, Content, Header } = Layout
const { Title } = Typography

const items = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/portal/admin/dashboard">数据概览</Link> },
  { key: 'users', icon: <UserOutlined />, label: <Link to="/portal/admin/users">用户管理</Link> },
  { key: 'merchants', icon: <ShopOutlined />, label: <Link to="/portal/admin/merchants">商户审核</Link> },
  { key: 'products', icon: <ShoppingOutlined />, label: <Link to="/portal/admin/products">商品审核</Link> },
  { key: 'categories', icon: <AppstoreOutlined />, label: <Link to="/portal/admin/categories">分类管理</Link> },
  { key: 'orders', icon: <UnorderedListOutlined />, label: <Link to="/portal/admin/orders">订单监控</Link> },
  { key: 'withdrawals', icon: <CreditCardOutlined />, label: <Link to="/portal/admin/withdrawals">提现审核</Link> },
  { key: 'membership', icon: <CrownOutlined />, label: <Link to="/portal/admin/membership">会员等级</Link> },
  { key: 'redemption', icon: <GiftOutlined />, label: <Link to="/portal/admin/redemption">核销记录</Link> },
  { key: 'commission', icon: <PercentageOutlined />, label: <Link to="/portal/admin/commission">佣金设置</Link> },
  { key: 'analytics', icon: <BarChartOutlined />, label: <Link to="/portal/admin/analytics">运营分析</Link> },
  { key: 'refunds', icon: <UndoOutlined />, label: <Link to="/portal/admin/refunds">退款管理</Link> },
  { key: 'settings', icon: <SettingOutlined />, label: <Link to="/portal/admin/settings">系统设置</Link> },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const { isMobile } = useResponsive()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selected = location.pathname.split('/').pop() || 'dashboard'

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: '个人资料', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
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
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span />
          <Dropdown menu={{ items: menuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.nickname || user?.phone || 'Admin'}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24, padding: isMobile ? 16 : 24, background: colorBgContainer, borderRadius: borderRadiusLG }}>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </Content>
      </Layout>
    </Layout>
  )
}
