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
  HeartOutlined,
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
    { key: 'home', icon: <HomeOutlined />, label: <Link to="/portal/user/home">首页</Link> },
    { key: 'cart', icon: <Badge count={cartCount} showZero><ShoppingCartOutlined /></Badge>, label: <Link to="/portal/user/cart">购物车</Link> },
    { key: 'orders', icon: <UnorderedListOutlined />, label: <Link to="/portal/user/orders">订单</Link> },
    { key: 'wishlist', icon: <HeartOutlined />, label: <Link to="/portal/user/wishlist">收藏</Link> },
    { key: 'wallet', icon: <WalletOutlined />, label: <Link to="/portal/user/wallet">钱包</Link> },
    { key: 'referral', icon: <TeamOutlined />, label: <Link to="/portal/user/referral">推荐</Link> },
    { key: 'health', icon: <MedicineBoxOutlined />, label: <Link to="/portal/user/health">健康</Link> },
    { key: 'profile', icon: <UserOutlined />, label: <Link to="/portal/user/profile">我的</Link> },
  ]

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: '个人资料', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login') } },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Title level={4} style={{ margin: 0, color: '#1677ff' }}>HealthCoin</Title>
        <Menu mode="horizontal" selectedKeys={[selected]} items={items} style={{ flex: 1, justifyContent: 'flex-end', border: 'none' }} />
        <Dropdown menu={{ items: menuItems }} placement="bottomRight">
          <Space style={{ marginLeft: 16, cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <Text>{user?.nickname || user?.phone || '用户'}</Text>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: 24 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', background: colorBgContainer, borderRadius: borderRadiusLG, padding: 0, minHeight: 600, overflow: 'hidden' }}>
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>HealthCoin ©{new Date().getFullYear()} 健康币平台</Footer>
    </Layout>
  )
}
