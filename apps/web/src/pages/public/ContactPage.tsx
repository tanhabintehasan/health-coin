import { useState } from 'react'
import { Card, Row, Col, Typography, Form, Input, Button, message } from 'antd'
import { PhoneOutlined, MailOutlined, EnvironmentOutlined, WechatOutlined } from '@ant-design/icons'
import { useResponsive } from '../../hooks/useResponsive'
import { api } from '../../services/api'

const { Title, Text } = Typography

export default function ContactPage() {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const { isMobile } = useResponsive()

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      await api.submitContact(values)
      message.success('提交成功，我们的客服会尽快与您联系！')
      form.resetFields()
    } catch (err: any) {
      message.error(err?.message || '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div style={{ background: '#1677ff', color: '#fff', padding: isMobile ? '40px 16px' : '64px 24px', textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff', marginBottom: 8 }}>联系我们</Title>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>商务合作、商户入驻、客服咨询</Text>
      </div>

      <div style={{ padding: isMobile ? '32px 16px' : '64px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <Row gutter={[48, 48]}>
          <Col xs={24} md={10}>
            <Title level={4}>联系方式</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
              <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e6f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PhoneOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>客服热线</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>400-888-6666</div>
                  </div>
                </div>
              </Card>
              <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f6ffed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <WechatOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>微信公众号</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>healthcoin_official</div>
                  </div>
                </div>
              </Card>
              <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff2e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MailOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>商务邮箱</div>
                    <div style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>support@healthcoin.cn</div>
                  </div>
                </div>
              </Card>
              <Card style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f9f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EnvironmentOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>公司地址</div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: '#333' }}>上海市浦东新区张江高科技园区</div>
                  </div>
                </div>
              </Card>
            </div>
          </Col>

          <Col xs={24} md={14}>
            <Card style={{ borderRadius: 12 }}>
              <Title level={4}>在线咨询</Title>
              <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item name="name" label="您的姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                      <Input placeholder="请输入姓名" size="large" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item name="phone" label="联系电话" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}>
                      <Input placeholder="请输入手机号" size="large" maxLength={11} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="type" label="咨询类型" rules={[{ required: true, message: '请选择咨询类型' }]}>
                  <Input placeholder="例如：商户入驻 / 技术支持 / 商务合作" size="large" />
                </Form.Item>
                <Form.Item name="content" label="咨询内容" rules={[{ required: true, message: '请填写咨询内容' }]}>
                  <Input.TextArea rows={5} placeholder="请详细描述您的需求，我们会尽快回复" size="large" />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="large" block loading={submitting}>提交咨询</Button>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}
