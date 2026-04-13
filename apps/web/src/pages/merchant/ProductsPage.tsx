import { useEffect, useState } from 'react'
import { Card, Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, Typography, Popconfirm, message, Row, Col, Slider } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { api } from '../../services/api'
import { useResponsive } from '../../hooks/useResponsive'

const { Title } = Typography
const { TextArea } = Input

const PRODUCT_TYPE_OPTIONS = [
  { value: 'PHYSICAL', label: 'Physical Product' },
  { value: 'SERVICE', label: 'Service (Redemption)' },
]

const DELIVERY_TYPE_OPTIONS = [
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'IN_STORE_REDEMPTION', label: 'In-Store Redemption' },
]

export default function ProductsPage() {
  const { isMobile } = useResponsive()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()
  const productType = Form.useWatch('productType', form)

  const fetchProducts = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await api.getMerchantProducts({ page: p, limit: 10 })
      setProducts(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    fetchProducts()
    api.getCategories().then((cats: any) => {
      const flat: any[] = []
      const flatten = (nodes: any[], prefix = '') => {
        nodes.forEach((n: any) => {
          flat.push({ value: n.id, label: `${prefix}${n.name}` })
          if (n.children?.length) flatten(n.children, `${prefix}${n.name} / `)
        })
      }
      flatten(cats ?? [])
      setCategories(flat)
    }).catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ productType: 'PHYSICAL', deliveryType: 'DELIVERY', coinOffsetRate: 0 })
    setModalOpen(true)
  }

  const openEdit = (record: any) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      categoryId: record.categoryId,
      productType: record.productType,
      deliveryType: record.deliveryType ?? 'DELIVERY',
      coinOffsetRate: parseFloat(record.coinOffsetRate ?? '0'),
      validityDays: record.validityDays,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    try {
      if (editing) {
        await api.updateProduct(editing.id, {
          name: values.name,
          description: values.description,
          deliveryType: values.deliveryType,
          coinOffsetRate: values.coinOffsetRate,
          validityDays: values.validityDays,
        })
        message.success('Product updated')
      } else {
        await api.createProduct({
          name: values.name,
          description: values.description,
          categoryId: values.categoryId,
          productType: values.productType,
          deliveryType: values.deliveryType,
          coinOffsetRate: values.coinOffsetRate,
          validityDays: values.productType === 'SERVICE' ? values.validityDays : undefined,
          variants: [{ name: 'Default', price: values.price, stock: values.stock }],
        })
        message.success('Product created')
      }
      setModalOpen(false)
      fetchProducts(page)
    } catch (err: any) {
      message.error(err?.message || 'Failed to save product')
    }
  }

  const handleDelete = async (id: string) => {
    try { await api.deleteProduct(id); message.success('Product deleted'); fetchProducts(page) }
    catch (err: any) { message.error(err?.message || 'Failed to delete') }
  }

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Type', dataIndex: 'productType', key: 'productType', width: 100, render: (v: string) => <Tag color={v === 'PHYSICAL' ? 'blue' : 'green'}>{v}</Tag> },
    { title: 'Delivery', dataIndex: 'deliveryType', key: 'deliveryType', width: 130, render: (v: string) => <Tag>{v === 'IN_STORE_REDEMPTION' ? 'In-Store' : 'Delivery'}</Tag> },
    { title: 'Price', key: 'basePrice', width: 100, render: (_: any, r: any) => `¥${(parseFloat(r.basePrice) / 100).toFixed(2)}` },
    { title: 'Coin Offset', dataIndex: 'coinOffsetRate', key: 'coinOffsetRate', width: 100, render: (v: string) => `${(parseFloat(v || '0') * 100).toFixed(0)}%` },
    { title: 'Status', dataIndex: 'status', key: 'status', width: 110, render: (v: string) => <Tag color={v === 'ACTIVE' ? 'green' : v === 'PENDING_REVIEW' ? 'orange' : 'default'}>{v}</Tag> },
    { title: 'Actions', key: 'actions', width: 120, render: (_: any, record: any) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
        <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Products</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Product</Button>
      </div>
      <Card>
        <div className="table-responsive">
          <Table dataSource={products} columns={columns} rowKey="id" loading={loading} pagination={{ total, pageSize: 10, current: page, onChange: (p) => { setPage(p); fetchProducts(p) } }} scroll={{ x: 'max-content' }} />
        </div>
      </Card>
      <Modal title={editing ? 'Edit Product' : 'New Product'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} width={isMobile ? '90%' : 640} style={{ maxWidth: 'calc(100vw - 32px)' }} okText={editing ? 'Update' : 'Create'}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={24} sm={16}><Form.Item name="name" label="Product Name" rules={[{ required: true }]}><Input placeholder="Product name" /></Form.Item></Col>
            <Col xs={24} sm={8}><Form.Item name="productType" label="Type" rules={[{ required: true }]}><Select options={PRODUCT_TYPE_OPTIONS} disabled={!!editing} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="deliveryType" label="Delivery Type" rules={[{ required: true }]}><Select options={DELIVERY_TYPE_OPTIONS} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="categoryId" label="Category"><Select options={categories} placeholder="Select category" allowClear showSearch /></Form.Item></Col>
          </Row>
          <Form.Item name="coinOffsetRate" label={`HealthCoin Offset Rate: ${Math.round((form.getFieldValue('coinOffsetRate') ?? 0) * 100)}%`}>
            <Slider min={0} max={1} step={0.05} marks={{ 0: '0%', 0.5: '50%', 1: '100%' }} />
          </Form.Item>
          {!editing && (
            <Row gutter={16}>
              <Col xs={24} sm={12}><Form.Item name="price" label="Price (¥)" rules={[{ required: true }]}><InputNumber min={0} precision={2} style={{ width: '100%' }} prefix="¥" /></Form.Item></Col>
              <Col xs={24} sm={12}><Form.Item name="stock" label="Stock" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          )}
          {productType === 'SERVICE' && (
            <Form.Item name="validityDays" label="Validity (days after purchase)"><InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 30" /></Form.Item>
          )}
          <Form.Item name="description" label="Description"><TextArea rows={3} placeholder="Product description..." /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
