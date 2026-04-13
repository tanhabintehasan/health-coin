import { useNavigate } from 'react-router-dom'
import { Card, Row, Col, Typography, Steps, Button, List, Space } from 'antd'
import { ShopOutlined, SafetyOutlined, DollarOutlined, TeamOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const benefits = [
  { icon: <TeamOutlined style={{ fontSize: 28, color: '#1677ff' }} />, title: '流量扶持', desc: '平台会员裂变推广，商户共享千万级健康消费人群' },
  { icon: <DollarOutlined style={{ fontSize: 28, color: '#52c41a' }} />, title: '多元结算', desc: '支持健康币抵扣+现金支付，资金结算快速到账' },
  { icon: <SafetyOutlined style={{ fontSize: 28, color: '#fa8c16' }} />, title: '正品背书', desc: '平台统一审核与品控，提升品牌公信力' },
  { icon: <ShopOutlined style={{ fontSize: 28, color: '#722ed1' }} />, title: '运营工具', desc: '提供商品管理、订单处理、扫码核销一站式工具' },
]

const materials = [
  '营业执照（企业/个体户）',
  '法人身份证正反面',
  '门店/仓库照片（至少3张）',
  '银行对公账户或法人个人账户',
  '品牌授权书（如为代理商）',
  '相关行业资质许可（食品/医疗器械等）',
]

export default function MerchantJoinPage() {
  const navigate = useNavigate()

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', color: '#fff', padding: '80px 24px', textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>成为 HealthCoin 商户</Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18 }}>入驻健康积分电商平台，共享健康消费新红利</Text>
      </div>

      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>入驻优势</Title>
        <Row gutter={[24, 24]}>
          {benefits.map((b, idx) => (
            <Col xs={24} sm={12} key={idx}>
              <Card style={{ borderRadius: 12, height: '100%' }}>
                <div style={{ marginBottom: 12 }}>{b.icon}</div>
                <Title level={5}>{b.title}</Title>
                <Text type="secondary">{b.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      <div style={{ padding: '64px 24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>入驻流程</Title>
          <Steps
            direction="horizontal"
            current={-1}
            items={[
              { title: '提交申请', description: '填写商户信息并上传资质' },
              { title: '平台审核', description: '1-3个工作日内完成审核' },
              { title: '签署协议', description: '在线签署平台合作协议' },
              { title: '上架商品', description: '完善店铺信息并发布商品' },
              { title: '开始营业', description: '接收订单并提供服务' },
            ]}
          />
        </div>
      </div>

      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={12}>
            <Title level={4}>所需资料</Title>
            <List
              style={{ marginTop: 16 }}
              dataSource={materials}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text>{item}</Text>
                  </Space>
                </List.Item>
              )}
            />
          </Col>
          <Col xs={24} md={12}>
            <Card style={{ borderRadius: 12, background: '#f6ffed', borderColor: '#b7eb8f' }}>
              <Title level={4}>准备好开店了吗？</Title>
              <Text style={{ display: 'block', marginBottom: 24 }}>
                立即注册账号并提交商户入驻申请，我们的商务团队会在1-3个工作日内与您联系。
              </Text>
              <Button type="primary" size="large" block onClick={() => navigate('/register')}>
                立即申请入驻
              </Button>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
