import { Result, Button } from 'antd'

export function ErrorFallback({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={{ padding: 40 }}>
      <Result
        status="error"
        title="Something went wrong"
        subTitle={message || 'Failed to load data. Please try again later.'}
        extra={
          onRetry ? (
            <Button type="primary" onClick={onRetry}>Retry</Button>
          ) : (
            <Button type="primary" onClick={() => window.location.reload()}>Reload Page</Button>
          )
        }
      />
    </div>
  )
}
