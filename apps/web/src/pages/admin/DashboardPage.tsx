import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Typography, Spin, Alert } from 'antd'
import { ShoppingOutlined, WalletOutlined, PayCircleOutlined, DollarOutlined, RiseOutlined, TeamOutlined, ShopOutlined, UserOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'
import { useNavigate } from 'react-router-dom'

const STAT_CARD_STYLES: Record<string, React.CSSProperties> = {
  orders: { borderLeft: '4px solid #1677ff' },
  revenue: { borderLeft: '4px solid #52c41a' },
  withdrawals: { borderLeft: '4px solid #f5222d' },
  paidOut: { borderLeft: '4px solid #fa8c16' },
  mutual: { borderLeft: '4px solid #722ed1' },
  universal: { borderLeft: '4px solid #13c2c2' },
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'orange',
  PAID: 'blue',
  PROCESSING: 'blue',
  SHIPPED: 'purple',
  DELIVERED: 'cyan',
  COMPLETED: 'green',
  CANCELLED: 'default',
  REFUNDING: 'red',
  REFUNDED: 'default',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [pendingMerchants, setPendingMerchants] = useState(0)
  const [pendingProducts, setPendingProducts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [summaryRes, ordersRes, merchantsRes, productsRes] = await Promise.all([
        api.getFinanceSummary().catch(() => null),
        api.getAdminOrders({ limit: 5, page: 1 }).catch(() => null),
        api.getAdminMerchants({ status: 'PENDING', page: 1, limit: 1 }).catch(() => null),
        api.getPendingProducts({ page: 1, limit: 1 }).catch(() => null),
      ])
      setSummary(summaryRes)
      setRecentOrders((ordersRes as any)?.data ?? [])
      setPendingMerchants((merchantsRes as any)?.meta?.total ?? 0)
      setPendingProducts((productsRes as any)?.meta?.total ?? 0)
    } catch (err: any) {
      setError(typeof err === 'string' ? err : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div style={{ minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  const orderColumns = [
    { title: '订单号', dataIndex: 'id', key: 'id', render: (v: string) => `#${v.slice(-8).toUpperCase()}`, width: 130 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => <Tag color={ORDER_STATUS_COLOR[v] ?? 'default'}>{(v ?? '').replace(/_/g, ' ')}</Tag>,
    },
    { title: '金额', dataIndex: 'totalAmount', key: 'totalAmount', render: (v: string) => `¥${(Number(v) / 100).toFixed(2)}` },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 24 }}>数据概览</Typography.Title>
      {error && <Alert type="error" message={error} style={{ marginBottom: 24 }} showIcon closable onClose={() => setError(null)} />}
      {!error && !summary && (
        <Alert type="warning" message="财务汇总接口暂未返回数据，部分统计为占位展示。" style={{ marginBottom: 24 }} showIcon />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/portal/admin/merchants')}>
            <Statistic title="待审核商户" value={pendingMerchants} prefix={<ShopOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: pendingMerchants > 0 ? '#fa8c16' : '#333' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable onClick={() => navigate('/portal/admin/products')}>
            <Statistic title="待审核商品" value={pendingProducts} prefix={<ExclamationCircleOutlined style={{ color: '#f5222d' }} />} valueStyle={{ color: pendingProducts > 0 ? '#f5222d' : '#333' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="注册用户" value={summary?.totalUsers ?? '-'} prefix={<UserOutlined style={{ color: '#1677ff' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="入驻商户" value={summary?.totalMerchants ?? '-'} prefix={<ShopOutlined style={{ color: '#52c41a' }} />} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<span><RiseOutlined style={{ marginRight: 8, color: '#1677ff' }} />平台运营数据</span>}
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.orders} bordered={false} styles={{ body: { background: '#f6f9ff', borderRadius: 6 } }}>
              <Statistic title="已完成订单" value={summary?.totalCompletedOrders ?? 0} prefix={<ShoppingOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.revenue} bordered={false} styles={{ body: { background: '#f6fff6', borderRadius: 6 } }}>
              <Statistic title="平台总营收" value={summary?.totalRevenue ?? '0'} prefix={<DollarOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} suffix="HC" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.withdrawals} bordered={false} styles={{ body: { background: '#fff6f6', borderRadius: 6 } }}>
              <Statistic title="待处理提现" value={summary?.pendingWithdrawals ?? 0} prefix={<WalletOutlined style={{ color: summary?.pendingWithdrawals > 0 ? '#f5222d' : '#999' }} />} valueStyle={{ color: summary?.pendingWithdrawals > 0 ? '#f5222d' : '#333' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.paidOut} bordered={false} styles={{ body: { background: '#fffbf0', borderRadius: 6 } }}>
              <Statistic title="累计提现发放" value={summary?.totalPaidOut ?? '0'} prefix={<PayCircleOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: '#fa8c16' }} suffix="HC" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.mutual} bordered={false} styles={{ body: { background: '#faf0ff', borderRadius: 6 } }}>
              <Statistic title="互助币发放总量" value={summary?.totalMutualCoinsIssued ?? '0'} prefix={<TeamOutlined style={{ color: '#722ed1' }} />} valueStyle={{ color: '#722ed1' }} suffix="枚" />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card style={STAT_CARD_STYLES.universal} bordered={false} styles={{ body: { background: '#f0fffe', borderRadius: 6 } }}>
              <Statistic title="万能币发放总量" value={summary?.totalUniversalCoinsIssued ?? '0'} prefix={<DollarOutlined style={{ color: '#13c2c2' }} />} valueStyle={{ color: '#13c2c2' }} suffix="枚" />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="最近订单">
        <div className="table-responsive">
          <Table dataSource={recentOrders} columns={orderColumns} rowKey="id" pagination={false} size="small" locale={{ emptyText: '暂无最近订单' }} scroll={{ x: 'max-content' }} />
        </div>
      </Card>
    </div>
  )
}
