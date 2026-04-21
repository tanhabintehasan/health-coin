import { useEffect, useState } from 'react'
import { Card, Typography, Button, Form, Input, Steps, message, Result, Spin, Upload } from 'antd'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'
import { UploadOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export default function MerchantApplyPage() {
  const navigate = useNavigate()
  useResponsive()
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [checking, setChecking] = useState(true)
  const [merchantStatus, setMerchantStatus] = useState<string | null>(null)
  const [merchantName, setMerchantName] = useState('')

  useEffect(() => {
    api.getMyMerchant()
      .then((m: any) => {
        setMerchantStatus(m.status)
        setMerchantName(m.name)
      })
      .catch(() => {
        setMerchantStatus(null)
      })
      .finally(() => setChecking(false))
  }, [])

  const normFile = (e: any) => {
    if (Array.isArray(e)) return e
    return e?.fileList
  }

  const handleUpload = async (file: File): Promise<string> => {
    const res: any = await api.uploadFile(file)
    return res.url
  }

  const onFinish = async (values: any) => {
    setSubmitting(true)
    try {
      let logoUrl = values.logoUrl
      let licenseUrl = values.licenseUrl

      if (values.logoFile?.[0]?.originFileObj) {
        logoUrl = await handleUpload(values.logoFile[0].originFileObj)
      }
      if (values.licenseFile?.[0]?.originFileObj) {
        licenseUrl = await handleUpload(values.licenseFile[0].originFileObj)
      }

      await api.applyMerchant({
        name: values.name,
        description: values.description,
        contactPhone: values.contactPhone,
        address: values.address,
        licenseNo: values.licenseNo,
        logoUrl,
        documents: licenseUrl ? [{ type: 'business_license', url: licenseUrl }] : undefined,
      })
      setSubmitted(true)
      message.success('入驻申请已提交')
    } catch (err: any) {
      message.error(err || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      </Card>
    )
  }

  if (merchantStatus === 'PENDING') {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
        <Result
          status="info"
          title="入驻申请审核中"
          subTitle={`您提交的「${merchantName}」入驻申请正在审核中，平台将在 1-3 个工作日内完成审核，请留意短信通知。`}
          extra={[
            <Button type="primary" key="home" onClick={() => navigate('/portal/merchant/dashboard')}>返回控制台</Button>,
          ]}
        />
      </Card>
    )
  }

  if (merchantStatus === 'REJECTED') {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
        <Result
          status="warning"
          title="入驻申请已被驳回"
          subTitle="您的入驻申请未通过审核。您可以联系平台客服了解详情，或修改资料后重新提交。"
          extra={[
            <Button type="primary" key="retry" onClick={() => { setMerchantStatus(null); }}>重新申请</Button>,
            <Button key="home" onClick={() => navigate('/portal/merchant/dashboard')}>返回控制台</Button>,
          ]}
        />
      </Card>
    )
  }

  if (merchantStatus === 'APPROVED') {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
        <Result
          status="success"
          title="您已经是认证商户"
          subTitle={`您的商户「${merchantName}」已通过审核，可以开始上架商品。`}
          extra={[
            <Button type="primary" key="products" onClick={() => navigate('/portal/merchant/products')}>管理商品</Button>,
            <Button key="home" onClick={() => navigate('/portal/merchant/dashboard')}>返回控制台</Button>,
          ]}
        />
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
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
    <Card style={{ maxWidth: 800, margin: '24px auto', borderRadius: 12 }}>
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
        <Form.Item name="logoFile" label="商户Logo" valuePropName="fileList" getValueFromEvent={normFile}>
          <Upload beforeUpload={() => false} maxCount={1} listType="picture">
            <Button icon={<UploadOutlined />}>上传Logo</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="licenseFile" label="营业执照" valuePropName="fileList" getValueFromEvent={normFile}>
          <Upload beforeUpload={() => false} maxCount={1} listType="picture">
            <Button icon={<UploadOutlined />}>上传营业执照</Button>
          </Upload>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block size="large">提交入驻申请</Button>
        </Form.Item>
      </Form>
    </Card>
  )
}
