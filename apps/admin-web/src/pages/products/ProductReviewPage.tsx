import { useEffect, useState } from 'react'
import {
  Table, Tag, Typography, Space, Button, Modal, Descriptions, Image, message,
} from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import client from '../../api/client'
import dayjs from 'dayjs'

export default function ProductReviewPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [preview, setPreview] = useState<any>(null)

  const fetchPending = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await client.get(`/admin/products/pending?page=${p}&limit=20`)
      setProducts(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPending() }, [])

  const handleApprove = async (id: string) => {
    try {
      await client.patch(`/admin/products/${id}/approve`)
      message.success('Product approved')
      fetchPending(page)
      setPreview(null)
    } catch {
      message.error('Approval failed')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await client.patch(`/admin/products/${id}/reject`)
      message.success('Product rejected')
      fetchPending(page)
      setPreview(null)
    } catch {
      message.error('Rejection failed')
    }
  }

  const columns = [
    { title: 'Product Name', dataIndex: 'name', key: 'name', ellipsis: true },
    {
      title: 'Merchant',
      key: 'merchant',
      render: (_: any, r: any) => r.merchant?.name || '-',
    },
    {
      title: 'Type', dataIndex: 'productType', key: 'productType', width: 100,
      render: (v: string) => <Tag color={v === 'PHYSICAL' ? 'blue' : 'green'}>{v}</Tag>,
    },
    {
      title: 'Price', key: 'basePrice', width: 100,
      render: (_: any, r: any) => `¥${(parseFloat(r.basePrice) / 100).toFixed(2)}`,
    },
    {
      title: 'Coin Offset', dataIndex: 'coinOffsetRate', key: 'coinOffsetRate', width: 100,
      render: (v: string) => `${(parseFloat(v || '0') * 100).toFixed(0)}%`,
    },
    {
      title: 'Submitted', dataIndex: 'createdAt', key: 'createdAt', width: 110,
      render: (v: string) => dayjs(v).format('MM-DD HH:mm'),
    },
    {
      title: 'Actions', key: 'actions', width: 200,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small" icon={<EyeOutlined />}
            onClick={() => setPreview(record)}
          >
            Preview
          </Button>
          <Button
            size="small" type="primary" icon={<CheckOutlined />}
            onClick={() => handleApprove(record.id)}
          >
            Approve
          </Button>
          <Button
            size="small" danger icon={<CloseOutlined />}
            onClick={() => handleReject(record.id)}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        Product Review Queue
        {total > 0 && <Tag color="orange" style={{ marginLeft: 12, fontSize: 14 }}>{total} pending</Tag>}
      </Typography.Title>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={products}
        loading={loading}
        pagination={{
          total, pageSize: 20, current: page,
          onChange: (p) => { setPage(p); fetchPending(p) },
        }}
      />

      <Modal
        title="Product Preview"
        open={!!preview}
        onCancel={() => setPreview(null)}
        width={640}
        footer={
          <Space>
            <Button onClick={() => setPreview(null)}>Cancel</Button>
            <Button danger icon={<CloseOutlined />} onClick={() => handleReject(preview?.id)}>Reject</Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={() => handleApprove(preview?.id)}>Approve</Button>
          </Space>
        }
      >
        {preview && (
          <div>
            {preview.images?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Image.PreviewGroup>
                  {preview.images.map((url: string, i: number) => (
                    <Image key={i} src={url} width={120} height={90} style={{ objectFit: 'cover', marginRight: 8 }} />
                  ))}
                </Image.PreviewGroup>
              </div>
            )}
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Name" span={2}>{preview.name}</Descriptions.Item>
              <Descriptions.Item label="Merchant">{preview.merchant?.name}</Descriptions.Item>
              <Descriptions.Item label="Type">{preview.productType}</Descriptions.Item>
              <Descriptions.Item label="Delivery">{preview.deliveryType}</Descriptions.Item>
              <Descriptions.Item label="Coin Offset">
                {(parseFloat(preview.coinOffsetRate || '0') * 100).toFixed(0)}%
              </Descriptions.Item>
              <Descriptions.Item label="Base Price">
                ¥{(parseFloat(preview.basePrice) / 100).toFixed(2)}
              </Descriptions.Item>
              <Descriptions.Item label="Submitted">
                {dayjs(preview.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              {preview.description && (
                <Descriptions.Item label="Description" span={2}>
                  {preview.description}
                </Descriptions.Item>
              )}
            </Descriptions>
            {preview.variants?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Typography.Text strong>Variants</Typography.Text>
                <Table
                  size="small"
                  dataSource={preview.variants}
                  rowKey="id"
                  pagination={false}
                  style={{ marginTop: 8 }}
                  columns={[
                    { title: 'Name', dataIndex: 'name', key: 'name' },
                    { title: 'Price', key: 'price', render: (_: any, v: any) => `¥${(parseFloat(v.price) / 100).toFixed(2)}` },
                    { title: 'Stock', dataIndex: 'stock', key: 'stock' },
                  ]}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
