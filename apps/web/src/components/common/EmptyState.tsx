import { Empty } from 'antd'

export function EmptyState({ description }: { description?: string }) {
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <Empty description={description || 'No data available'} />
    </div>
  )
}
