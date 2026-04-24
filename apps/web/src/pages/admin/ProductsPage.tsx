import { useEffect, useState } from 'react'
import { Table, Tag, Typography, Space, Button, Drawer, Descriptions, Image, message, Timeline, Spin } from 'antd'
import { CheckOutlined, CloseOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'
import { useResponsive } from '../../hooks/useResponsive'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'success', PENDING_REVIEW: 'orange', REJECTED: 'error', INACTIVE: 'default', DRAFT: 'default',
}

const AUDIT_STATUS_ICON: Record<string, any> = {
  ACTIVE: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  INACTIVE: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  PENDING_REVIEW: <ClockCircleOutlined style={{ color: '#fa8c16' }} />,
}

export default function ProductsPage() {
  const { isMobile } = useResponsive()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditLoading, setAuditLoading] = useState(false)

  const fetchProducts = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await api.getPendingProducts({ page: p, limit: 20 })
      setProducts(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch (err) { console.error(err); message.error('Failed to load products'); setProducts([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [])

  const fetchAuditLogs = async (productId: string) => {
    setAuditLoading(true)
    try {
      const logs = await api.getProductAuditLogs(productId)
      setAuditLogs(logs ?? [])
    } catch {
      setAuditLogs([])
    } finally {
      setAuditLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try { await api.approveProduct(id); message.success('Product approved'); fetchProducts(page); if (selected?.id === id) { setSelected(null); setAuditLogs([]) } }
    catch { message.error('Failed to approve') }
  }

  const handleReject = async (id: string) => {
    try { await api.rejectProduct(id); message.success('Product rejected'); fetchProducts(page); if (selected?.id === id) { setSelected(null); setAuditLogs([]) } }
    catch { message.error('Failed to reject') }
  }

  const openDetail = (record: any) => {
    setSelected(record)
    fetchAuditLogs(record.id)
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Merchant', key: 'merchant', render: (_: any, r: any) => r.merchant?.name || '-' },
    { title: 'Type', dataIndex: 'productType', key: 'productType', width: 110, render: (v: string) => <Tag color={v === 'PHYSICAL' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'Price', key: 'price', width: 110, render: (_: any, r: any) => `¥${(Number(r.basePrice) / 100).toFixed(2)}` },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 120, render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag> },
    { title: 'Submitted', dataIndex: 'createdAt', key: 'createdAt', width: 120, render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, r: any) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openDetail(r)}>View</Button>
          {r.status === 'PENDING_REVIEW' && (
            <>
              <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleApprove(r.id)}>Approve</Button>
              <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleReject(r.id)}>Reject</Button>
            </>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Product Review</Typography.Title>
      <div className="table-responsive">
        <Table rowKey="id" columns={columns} dataSource={products} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchProducts(p) } }} scroll={{ x: 'max-content' }} />
      </div>

      <Drawer
        title="Product Detail & Audit History"
        open={!!selected}
        onClose={() => { setSelected(null); setAuditLogs([]) }}
        width={isMobile ? '100%' : 560}
        style={{ maxWidth: 'calc(100vw - 32px)' }}
      >
        {selected && (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Name">{selected.name}</Descriptions.Item>
              <Descriptions.Item label="Merchant">{selected.merchant?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Type">{selected.productType}</Descriptions.Item>
              <Descriptions.Item label="Delivery">{selected.deliveryType}</Descriptions.Item>
              <Descriptions.Item label="Price">¥{(Number(selected.basePrice) / 100).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Coin Offset">{(parseFloat(selected.coinOffsetRate || '0') * 100).toFixed(0)}%</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[selected.status]}>{selected.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Description">{selected.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="Submitted">{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
              {selected.images?.length > 0 && (
                <Descriptions.Item label="Images">
                  <Image.PreviewGroup>
                    <Space wrap>
                      {selected.images.map((url: string, idx: number) => (
                        <Image key={idx} src={url} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                      ))}
                    </Space>
                  </Image.PreviewGroup>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 24 }}>
              <Typography.Title level={5}>Audit Records</Typography.Title>
              {auditLoading && <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>}
              {!auditLoading && auditLogs.length === 0 && (
                <div style={{ color: '#999', padding: '16px 0' }}>No audit records yet</div>
              )}
              {!auditLoading && auditLogs.length > 0 && (
                <Timeline
                  items={auditLogs.map((log: any) => ({
                    dot: AUDIT_STATUS_ICON[log.newStatus] || <ClockCircleOutlined />,
                    children: (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                          {log.oldStatus} → {log.newStatus}
                        </div>
                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                          Admin: {log.admin?.user?.nickname || 'Unknown'} · {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm')}
                        </div>
                        {log.note && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Note: {log.note}</div>}
                      </div>
                    ),
                  }))}
                />
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
