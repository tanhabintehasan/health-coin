import { Card, Typography, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

export default function MerchantApplyPage() {
  const navigate = useNavigate()
  return (
    <Card style={{ maxWidth: 800, margin: '40px auto', borderRadius: 12 }}>
      <Title level={4}>商户入驻申请</Title>
      <Text>请完善资料后提交入驻申请，平台将在 1-3 个工作日内完成审核。</Text>
      <div style={{ marginTop: 24 }}>
        <Button type="primary" onClick={() => navigate('/portal/merchant/dashboard')}>返回控制台</Button>
      </div>
    </Card>
  )
}
