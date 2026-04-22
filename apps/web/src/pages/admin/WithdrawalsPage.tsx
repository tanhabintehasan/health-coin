import { useEffect, useState } from 'react'
import { Table, Tag, Button, Space, Typography, message, Modal, Form, Input, Select, Popconfirm, Alert } from 'antd'
import { api } from '../../services/api'
import dayjs from 'dayjs'

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [reviewModal, setReviewModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null })
  const [form] = Form.useForm()

  const fetchWithdrawals = async (p = 1) => {
    setLoading(true)
    try {
      const res: any = await api.getAdminWithdrawals({ page: p, limit: 20 })
      setWithdrawals(res?.data ?? [])
      setTotal(res?.meta?.total ?? 0)
    } catch (err) { console.error(err); message.error('Failed to load withdrawals'); setWithdrawals([]) } finally { setLoading(false) }
  }

  useEffect(() => { fetchWithdrawals() }, [])

  const handleReview = async (values: any) => {
    if (!reviewModal.id) return
    try {
      await api.reviewWithdrawal(reviewModal.id, values)
      message.success(`Withdrawal ${values.action.toLowerCase()}`)
      setReviewModal({ open: false, id: null })
      form.resetFields()
      fetchWithdrawals(page)
    } catch (err: any) {
      message.error(err || 'Review failed')
    }
  }

  const handleComplete = async (id: string) => {
    try { await api.completeWithdrawal(id); message.success('Marked as completed'); fetchWithdrawals(page) }
    catch (err: any) { message.error(err || 'Failed') }
  }

  const columns = [
    { title: 'User', key: 'user', render: (_: any, r: any) => r.user?.phone || '-' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v: string) => `${Number(v) / 100} coins` },
    { title: 'Net Payout', dataIndex: 'netAmount', key: 'netAmount', render: (v: string) => `${Number(v) / 100} coins` },
    { title: 'Method', dataIndex: 'payoutMethod', key: 'payoutMethod' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (v: string) => {
      const colors: Record<string, string> = { PENDING: 'orange', APPROVED: 'blue', COMPLETED: 'success', REJECTED: 'error' }
      return <Tag color={colors[v] ?? 'default'}>{v}</Tag>
    }},
    { title: 'Requested', dataIndex: 'createdAt', key: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
    {
      title: 'Actions', key: 'actions',
      render: (_: any, r: any) => (
        <Space>
          {r.status === 'PENDING' && <Button type="primary" size="small" onClick={() => { setReviewModal({ open: true, id: r.id }) }}>Review</Button>}
          {r.status === 'APPROVED' && (
            <Popconfirm title="Mark as completed?" onConfirm={() => handleComplete(r.id)}>
              <Button size="small">Mark Paid</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>Withdrawals</Typography.Title>
      <Alert type="info" showIcon message="Only pending withdrawals are shown by default." style={{ marginBottom: 16 }} />
      <div className="table-responsive">
        <Table rowKey="id" columns={columns} dataSource={withdrawals} loading={loading} pagination={{ total, pageSize: 20, current: page, onChange: (p) => { setPage(p); fetchWithdrawals(p) } }} scroll={{ x: 'max-content' }} />
      </div>

      <Modal title="Review Withdrawal" open={reviewModal.open} onCancel={() => { setReviewModal({ open: false, id: null }); form.resetFields() }} onOk={() => form.submit()} style={{ maxWidth: 'calc(100vw - 32px)' }}>
        <Form form={form} layout="vertical" onFinish={handleReview}>
          <Form.Item name="action" label="Decision" rules={[{ required: true }]}>
            <Select options={[{ label: 'Approve', value: 'APPROVED' }, { label: 'Reject', value: 'REJECTED' }]} />
          </Form.Item>
          <Form.Item name="adminNote" label="Note (optional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
