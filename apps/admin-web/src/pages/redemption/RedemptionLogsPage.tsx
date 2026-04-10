import { useEffect, useState } from 'react'
import { Table, Typography, Button, Space, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import client from '../../api/client'
import dayjs from 'dayjs'

export default function RedemptionLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = async (p = 1) => {
    setLoading(true)
    try {
      // Admin view: aggregate all merchant logs via admin endpoint
      const res: any = await client.get(`/admin/redemption/logs?page=${p}&limit=20`)
      setLogs(res.data?.data ?? [])
      setTotal(res.data?.meta?.total ?? 0)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await client.get('/admin/redemption/logs/export', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `redemption-logs-${dayjs().format('YYYY-MM-DD')}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Export downloaded')
    } catch {
      message.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    {
      title: 'Date', dataIndex: 'redeemedAt', key: 'redeemedAt', width: 150,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: 'Product',
      key: 'product',
      render: (_: any, r: any) => r.orderItem?.productName || '-',
    },
    {
      title: 'Variant',
      key: 'variant',
      render: (_: any, r: any) => r.orderItem?.variantName || '-',
    },
    {
      title: 'Code',
      key: 'code',
      render: (_: any, r: any) => r.orderItem?.redemptionCode || '-',
    },
    { title: 'Qty Redeemed', dataIndex: 'redeemedQty', key: 'redeemedQty', width: 120 },
    { title: 'Note', dataIndex: 'note', key: 'note', render: (v: string) => v || '-' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Redemption Logs</Typography.Title>
        <Button
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={handleExport}
        >
          Export CSV
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={logs}
        loading={loading}
        pagination={{
          total, pageSize: 20, current: page,
          onChange: (p) => { setPage(p); fetchLogs(p) },
        }}
      />
    </div>
  )
}
