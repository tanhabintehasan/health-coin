import { useEffect, useState } from 'react'
import { Card, Input, Button, Space, Typography, Table, Tag, Descriptions, InputNumber, message, Alert, Row, Col, Statistic } from 'antd'
import { QrcodeOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography

export default function RedemptionPage() {
  const { isMobile } = useResponsive()
  const [code, setCode] = useState('')
  const [scanning, setScanning] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [previewError, setPreviewError] = useState('')
  const [confirmQty, setConfirmQty] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)

  const fetchLogs = async (p = 1) => {
    setLogsLoading(true)
    try {
      const res: any = await api.getRedemptionLogs({ page: p, limit: 10 })
      setLogs(res?.data ?? [])
      setLogsTotal(res?.meta?.total ?? 0)
    } catch {} finally { setLogsLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  const scanCode = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setScanning(true)
    setPreview(null)
    setPreviewError('')
    try {
      const res: any = await api.scanCode(trimmed)
      setPreview(res)
      setConfirmQty(1)
    } catch (err: any) {
      setPreviewError(typeof err === 'string' ? err : 'Invalid or expired code')
    } finally { setScanning(false) }
  }

  const confirmRedemption = async () => {
    if (!preview) return
    setConfirming(true)
    try {
      await api.confirmRedemption(preview.orderItemId, confirmQty)
      message.success('Redemption confirmed!')
      setPreview(null)
      setCode('')
      setPreviewError('')
      fetchLogs(1)
    } catch (err: any) {
      message.error(typeof err === 'string' ? err : 'Failed to confirm redemption')
    } finally { setConfirming(false) }
  }

  const logColumns = [
    { title: 'Code', dataIndex: ['orderItem', 'redemptionCode'], key: 'code', render: (v: string) => <Text code>{v ?? '—'}</Text>, width: 140 },
    { title: 'Product', dataIndex: ['orderItem', 'productName'], key: 'product', ellipsis: true },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
    { title: 'Status', key: 'status', width: 90, render: () => <Tag color="green">COMPLETED</Tag> },
    { title: 'Time', dataIndex: 'createdAt', key: 'createdAt', width: 140, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: isMobile ? 16 : 24 }}>Redemption Scanner</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<Space><QrcodeOutlined /> Scan Code</Space>}>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input placeholder="Enter or scan redemption code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onPressEnter={scanCode} size="large" style={{ fontFamily: 'monospace', letterSpacing: 2 }} />
              <Button type="primary" size="large" icon={<SearchOutlined />} onClick={scanCode} loading={scanning}>Scan</Button>
            </Space.Compact>
            {previewError && <Alert type="error" message={previewError} showIcon style={{ marginBottom: 16 }} />}
            {preview && (
              <div>
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="Valid Code" style={{ marginBottom: 16 }} />
                <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
                  <Descriptions.Item label="Product">{preview.productName}</Descriptions.Item>
                  <Descriptions.Item label="Variant">{preview.variantName}</Descriptions.Item>
                  <Descriptions.Item label="Total Qty">{preview.totalQuantity}</Descriptions.Item>
                  <Descriptions.Item label="Already Redeemed">{preview.redeemedCount}</Descriptions.Item>
                  <Descriptions.Item label="Remaining"><Text strong style={{ color: '#52c41a' }}>{preview.remainingCount}</Text></Descriptions.Item>
                  <Descriptions.Item label="Expires">{preview.validUntil ? dayjs(preview.validUntil).format('YYYY-MM-DD') : 'No expiry'}</Descriptions.Item>
                </Descriptions>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>Quantity to Redeem</Text>
                  <Space wrap>
                    <InputNumber min={1} max={preview.remainingCount} value={confirmQty} onChange={(v) => setConfirmQty(v ?? 1)} style={{ minWidth: 80 }} />
                    <Button type="primary" size="large" onClick={confirmRedemption} loading={confirming} icon={<CheckCircleOutlined />}>Confirm Redemption</Button>
                  </Space>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card>
            <Row gutter={16}>
              <Col xs={12}><Statistic title="Total Redemptions" value={logsTotal} prefix={<QrcodeOutlined />} /></Col>
              <Col xs={12}><Statistic title="Today" value={logs.filter((l) => dayjs(l.createdAt).isAfter(dayjs().startOf('day'))).length} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>
      <Card title="Redemption History" style={{ marginTop: 24 }}>
        <div className="table-responsive">
          <Table dataSource={logs} columns={logColumns} rowKey="id" loading={logsLoading} pagination={{ total: logsTotal, pageSize: 10, current: logsPage, onChange: (p) => { setLogsPage(p); fetchLogs(p) } }} size="small" scroll={{ x: 'max-content' }} />
        </div>
      </Card>
    </div>
  )
}
