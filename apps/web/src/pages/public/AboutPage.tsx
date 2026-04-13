import { Card, Row, Col, Typography, Timeline } from 'antd'
import { AimOutlined, GlobalOutlined, SafetyOutlined, RocketOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function AboutPage() {
  return (
    <div>
      <div style={{ background: '#1677ff', color: '#fff', padding: '64px 24px', textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>关于 HealthCoin</Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>构建健康消费与数字资产的桥梁</Text>
      </div>

      <div style={{ padding: '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={12}>
            <Title level={4}>平台简介</Title>
            <Text style={{ fontSize: 15, lineHeight: 1.8, color: '#555' }}>
              HealthCoin（健康币平台）是一家专注于健康消费领域的积分电商与会员服务平台。
              我们整合健康产品、有机食材、中医理疗、体检服务等优质资源，通过“健康币+互助币+万能币”
              三位一体的数字资产体系，激励用户健康消费、分享推荐，实现消费者、商户与平台的多方共赢。
            </Text>
          </Col>
          <Col xs={24} md={12}>
            <Title level={4}>我们的使命</Title>
            <Text style={{ fontSize: 15, lineHeight: 1.8, color: '#555' }}>
              让每一次健康消费都产生长期价值。我们致力于通过区块链技术思维与积分经济模型，
              打通健康产业链上下游，建立透明、可信、可持续的健康消费生态。
            </Text>
          </Col>
        </Row>

        <div style={{ marginTop: 64 }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>为什么选择我们</Title>
          <Row gutter={[24, 24]}>
            {[
              { icon: <SafetyOutlined style={{ fontSize: 32, color: '#1677ff' }} />, title: '正品保障', desc: '严选商户入驻，商品审核机制完善，确保每一件商品都值得信赖' },
              { icon: <GlobalOutlined style={{ fontSize: 32, color: '#52c41a' }} />, title: '多商户生态', desc: '汇聚全国优质健康品牌，品类覆盖健康护理、有机食品、体检理疗' },
              { icon: <RocketOutlined style={{ fontSize: 32, color: '#fa8c16' }} />, title: '裂变增长', desc: '六级会员+两级推荐+辖区奖励，构建自驱型增长网络' },
              { icon: <AimOutlined style={{ fontSize: 32, color: '#722ed1' }} />, title: '灵活结算', desc: '支持健康币抵扣、第三方支付、万能币提现，资金周转高效' },
            ].map((item, idx) => (
              <Col xs={24} sm={12} key={idx}>
                <Card style={{ borderRadius: 12, height: '100%' }}>
                  <div style={{ marginBottom: 12 }}>{item.icon}</div>
                  <Title level={5}>{item.title}</Title>
                  <Text type="secondary">{item.desc}</Text>
                </Card>
              </Col>
            ))}
          </Row>
        </div>

        <div style={{ marginTop: 64 }}>
          <Title level={3} style={{ textAlign: 'center', marginBottom: 40 }}>发展历程</Title>
          <Timeline
            mode="alternate"
            items={[
              { children: <div><b>2024 Q1</b><div>平台立项，完成核心商业模型设计</div></div> },
              { children: <div><b>2024 Q3</b><div>上线三币体系与会员等级系统</div></div> },
              { children: <div><b>2025 Q1</b><div>首批商户入驻，开放健康商城</div></div> },
              { children: <div><b>2025 Q4</b><div>接入富友聚合支付，完善提现与结算体系</div></div> },
              { children: <div><b>2026</b><div>面向全国市场推广，打造健康消费第一平台</div></div> },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
