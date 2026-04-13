import { useEffect, useState } from 'react'
import { Table, Tag, Typography, Space, Button, Drawer, Descriptions, Image, message } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'success', PENDING_REVIEW: 'orange', REJECTED: 'error', INACTIVE: 'default',
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<any>(null)

  const fetchProducts = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await api.getPendingProducts({ page: p, limit: 20 })
      setProducts(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch { setProducts([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchProducts() }, [])

  const handleApprove = async (id: string) => {
    try { await api.approveProduct(id); message.success('Product approved'); fetchProducts(page); if (selected?.id === id) setSelected(null) }
    catch { message.error('Failed to approve') }
  }

  const handleReject = async (id: string) => {
    try { await api.rejectProduct(id); message.success('Product rejected'); fetchProducts(page); if (selected?.id === id) setSelected(null) }
    catch { message.error('Failed to reject') }
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
        <Space size="small">
          <Button type="link" size="small" onClick={() => setSelected(r)}>View</Button>
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
      <Table rowKey="id" columns={columns} dataSource={products} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchProducts(p) } }} />

      <Drawer title="Product Detail" open={!!selected} onClose={() => setSelected(null)} width={520}>
        {selected && (
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
                  <Space>
                    {selected.images.map((url: string, idx: number) => (
                      <Image key={idx} src={url} width={80} height={80} style={{ objectFit: 'cover', borderRadius: 6 }} />
                    ))}
                  </Space>
                </Image.PreviewGroup>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}
