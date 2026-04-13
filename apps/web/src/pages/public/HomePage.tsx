import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Row, Col, Typography, Space, Badge, Spin } from 'antd'
import {
  SafetyOutlined,
  ShopOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  WalletOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  QrcodeOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { api } from '../../services/api'

const { Title, Text } = Typography

const flowSteps = [
  { title: '注册登录', desc: '手机号一键注册' },
  { title: '推荐绑定', desc: '邀请码绑定关系' },
  { title: '浏览商城', desc: '多商户优选商品' },
  { title: '下单支付', desc: '三币灵活抵扣' },
  { title: '奖励发放', desc: '自动发放健康币' },
  { title: '核销/发货', desc: '到店核销或快递' },
  { title: '提现/结算', desc: '万能币提现到账' },
  { title: '平台管理', desc: '数据透明可视' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [merchants, setMerchants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.listProducts({ limit: 8 }).then((res: any) => setFeaturedProducts(res?.data ?? [])).catch(() => {}),
      api.listMerchantsPublic({ limit: 4 }).then((res: any) => setMerchants(res?.data ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
        <Title style={{ color: '#fff', fontSize: 48, marginBottom: 16 }}>HealthCoin 健康币平台</Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20, display: 'block', maxWidth: 720, margin: '0 auto 40px' }}>
          中国领先的健康积分电商平台 · 健康消费 · 数字资产 · 共享价值
        </Text>
        <Space size="large">
          <Button type="primary" size="large" style={{ background: '#fff', color: '#1677ff', borderColor: '#fff', fontWeight: 500 }} onClick={() => navigate('/shop')}>
            进入商城
          </Button>
          <Button ghost size="large" style={{ fontWeight: 500 }} onClick={() => navigate('/merchant-join')}>
            商户入驻
          </Button>
        </Space>
      </div>

      {/* Entry cards */}
      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>平台入口</Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, height: '100%' }} onClick={() => navigate('/login')}>
              <UserOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 16 }} />
              <Title level={4}>会员端入口</Title>
              <Text type="secondary">购物赚币 · 推荐奖励 · 健康档案 · 会员升级</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, height: '100%' }} onClick={() => navigate('/login')}>
              <ShopOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>商户端入口</Title>
              <Text type="secondary">商品管理 · 订单处理 · 扫码核销 · 收入结算</Text>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: 12, height: '100%' }} onClick={() => navigate('/login')}>
              <SafetyOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
              <Title level={4}>管理后台入口</Title>
              <Text type="secondary">会员管理 · 商户审核 · 财务统计 · 系统配置</Text>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Core features */}
      <div style={{ padding: '64px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>核心功能</Title>
          <Row gutter={[24, 24]}>
            {[
              { icon: <WalletOutlined style={{ fontSize: 32, color: '#1677ff' }} />, title: '三币体系', desc: '健康币、互助健康币、万能健康币，灵活抵扣与提现' },
              { icon: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />, title: '六级会员', desc: '普通会员到省级代理，升级透明，奖励丰厚' },
              { icon: <UnorderedListOutlined style={{ fontSize: 32, color: '#fa8c16' }} />, title: '多商户商城', desc: '严选健康品牌入驻，正品保障，分类齐全' },
              { icon: <QrcodeOutlined style={{ fontSize: 32, color: '#722ed1' }} />, title: '到店核销', desc: '服务类商品生成专属核销码，商户扫码即核销' },
              { icon: <DollarOutlined style={{ fontSize: 32, color: '#eb2f96' }} />, title: '动态分润', desc: '平台参数后台实时调整，分润规则透明可控' },
              { icon: <MedicineBoxOutlined style={{ fontSize: 32, color: '#13c2c2' }} />, title: '健康档案', desc: '会员上传体检报告，构建个人健康管理档案' },
            ].map((f, idx) => (
              <Col xs={24} sm={12} lg={8} key={idx}>
                <Card style={{ borderRadius: 12, height: '100%' }}>
                  <div style={{ marginBottom: 12 }}>{f.icon}</div>
                  <Title level={5}>{f.title}</Title>
                  <Text type="secondary">{f.desc}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/* Business flow */}
      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>业务流程</Title>
        <Row gutter={[16, 16]} justify="center">
          {flowSteps.map((step, idx) => (
            <Col key={idx} xs={12} sm={8} md={6} lg={3}>
              <div style={{ textAlign: 'center', padding: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#1677ff', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 'bold',
                }}>
                  {idx + 1}
                </div>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{step.title}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{step.desc}</div>
                {idx < flowSteps.length - 1 && (
                  <div style={{ display: 'none' }} />
                )}
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* Featured merchants */}
      <div style={{ padding: '64px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <Title level={3} style={{ margin: 0 }}>优选商户</Title>
            <Button type="link" onClick={() => navigate('/shop')}>查看更多 &gt;</Button>
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
            <Row gutter={[24, 24]}>
              {merchants.map((m: any) => (
                <Col xs={24} sm={12} lg={6} key={m.id}>
                  <Card hoverable style={{ borderRadius: 12 }} onClick={() => navigate(`/shop?merchantId=${m.id}`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={m.logoUrl || 'https://placehold.co/64x64?text=商户'} alt={m.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                      <div>
                        <div style={{ fontWeight: 500 }}>{m.name}</div>
                        <div style={{ fontSize: 12, color: '#888' }}>{m.region?.name || '全国'}</div>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </div>

      {/* Featured products */}
      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0 }}>热门推荐</Title>
          <Button type="link" onClick={() => navigate('/shop')}>查看更多 &gt;</Button>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <Row gutter={[24, 24]}>
            {featuredProducts.map((p: any) => (
              <Col xs={24} sm={12} lg={6} key={p.id}>
                <Card
                  hoverable
                  cover={<img alt={p.name} src={p.images?.[0] || 'https://placehold.co/300x200?text=No+Image'} style={{ height: 180, objectFit: 'cover' }} />}
                  style={{ borderRadius: 12, overflow: 'hidden' }}
                  onClick={() => navigate(`/shop?productId=${p.id}`)}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f5222d', fontWeight: 'bold', fontSize: 16 }}>¥{(Number(p.basePrice) / 100).toFixed(2)}</span>
                    {Number(p.coinOffsetRate) > 0 && <Badge count={`可抵${Math.round(Number(p.coinOffsetRate) * 100)}%`} style={{ backgroundColor: '#1677ff' }} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{p.merchant?.name}</div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* Trust / CTA */}
      <div style={{ padding: '64px 24px', background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)', color: '#fff', textAlign: 'center' }}>
        <Title level={3} style={{ color: '#fff', marginBottom: 16 }}>立即加入 HealthCoin</Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, display: 'block', marginBottom: 32 }}>
          无论是健康消费者、优质商户还是平台运营者，HealthCoin 都为您提供完整解决方案
        </Text>
        <Space size="large">
          <Button type="primary" size="large" style={{ background: '#fff', color: '#722ed1', borderColor: '#fff', fontWeight: 500 }} onClick={() => navigate('/register')}>
            免费注册
          </Button>
          <Button ghost size="large" style={{ fontWeight: 500 }} onClick={() => navigate('/contact')}>
            商务咨询
          </Button>
        </Space>
      </div>
    </div>
  )
}
