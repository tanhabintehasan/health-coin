import { useState } from 'react'
import { Card, Typography, Button, Form, Input, Steps, message, Result } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography

export default function MerchantApplyPage() {
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      await api.applyMerchant({
        name: values.name,
        description: values.description,
        contactPhone: values.contactPhone,
        address: values.address,
        licenseNo: values.licenseNo,
      })
      setSubmitted(true)
      message.success('入驻申请已提交')
    } catch (err: any) {
      message.error(err || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }} styles={{ body: { padding: isMobile ? 16 : 24 } }}>
        <Result
          status="success"
          title="入驻申请提交成功"
          subTitle="平台将在 1-3 个工作日内完成审核，请留意短信通知。"
          extra={[
            <Button type="primary" key="home" onClick={() => navigate('/portal/merchant/dashboard')}>返回控制台</Button>,
          ]}
        />
      </Card>
    )
  }

  return (
    <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }} styles={{ body: { padding: isMobile ? 16 : 24 } }}>
      <Title level={4}>商户入驻申请</Title>
      <Text type="secondary">请填写真实信息，平台审核通过后即可上架商品。</Text>

      <Steps current={0} items={[{ title: '填写资料' }, { title: '平台审核' }, { title: '签署协议' }, { title: '开始营业' }]} style={{ marginTop: 24, marginBottom: 24 }} />

      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="商户名称" rules={[{ required: true, message: '请输入商户名称' }]}>
          <Input placeholder="例如：康健大药房" />
        </Form.Item>
        <Form.Item name="description" label="商户简介" rules={[{ required: true, message: '请输入商户简介' }]}>
          <Input.TextArea rows={3} placeholder="主营品类、服务特色、品牌优势等" />
        </Form.Item>
        <Form.Item name="contactPhone" label="联系电话" rules={[{ required: true, pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }]}>
          <Input placeholder="联系人手机号" maxLength={11} />
        </Form.Item>
        <Form.Item name="address" label="经营地址" rules={[{ required: true, message: '请输入经营地址' }]}>
          <Input placeholder="省市区 + 详细街道门牌号" />
        </Form.Item>
        <Form.Item name="licenseNo" label="营业执照编号" rules={[{ required: true, message: '请输入营业执照编号' }]}>
          <Input placeholder="统一社会信用代码" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">提交入驻申请</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
