import { useEffect, useState } from 'react'
import { Card, Button, Table, Input, message, Space, Popconfirm, Tag, Row, Col } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await api.getCategories()
      const flat: any[] = []
      const walk = (nodes: any[], depth = 0) => {
        nodes.forEach((n) => {
          flat.push({ ...n, depth, key: n.id })
          if (n.children?.length) walk(n.children, depth + 1)
        })
      }
      walk(res || [])
      setCategories(flat)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

  const save = async () => {
    if (!name.trim()) { message.error('请输入分类名称'); return }
    try {
      if (editing?.id) {
        await api.updateCategory(editing.id, { name: name.trim(), sortOrder: Number(sortOrder) || 0 })
        message.success('更新成功')
      } else {
        await api.createCategory({ name: name.trim(), sortOrder: Number(sortOrder) || 0 })
        message.success('创建成功')
      }
      setEditing(null)
      setName('')
      setSortOrder('0')
      fetchCategories()
    } catch (err: any) {
      message.error(err || '保存失败')
    }
  }

  const remove = async (id: string) => {
    try {
      await api.deleteCategory(id)
      message.success('删除成功')
      fetchCategories()
    } catch (err: any) {
      message.error(err || '删除失败')
    }
  }

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name', render: (_: any, record: any) => (
      <span style={{ paddingLeft: record.depth * 24 }}>
        {record.depth > 0 && <Tag>子类</Tag>} {record.name}
      </span>
    )},
    { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder' },
    { title: '操作', key: 'action', render: (_: any, record: any) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); setName(record.name); setSortOrder(String(record.sortOrder || 0)) }}>编辑</Button>
        <Popconfirm title="确定删除？" onConfirm={() => remove(record.id)}>
          <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>分类管理</h2>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Input placeholder="分类名称" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Input placeholder="排序" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} style={{ width: '100%' }} />
          </Col>
          <Col xs={12} sm={10} md={8}>
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={save}>{editing ? '保存修改' : '新增分类'}</Button>
              {editing && <Button onClick={() => { setEditing(null); setName(''); setSortOrder('0') }}>取消</Button>}
            </Space>
          </Col>
        </Row>
      </Card>
      <div className="table-responsive">
        <Table dataSource={categories} columns={columns} loading={loading} pagination={false} scroll={{ x: 'max-content' }} />
      </div>
    </div>
  )
}
