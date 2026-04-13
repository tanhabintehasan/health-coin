import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore, UserRole } from '../../store/auth.store'
import { Spin, Result, Button } from 'antd'

export function RoleRoute({ allowed, children }: { allowed: UserRole[]; children: React.ReactNode }) {
  const { token, role, initialized, roleLoading } = useAuthStore()
  const location = useLocation()

  if (!initialized || roleLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Checking permissions..." />
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!role || !allowed.includes(role)) {
    return (
      <Result
        status="403"
        title="Access Denied"
        subTitle="You don't have permission to view this page."
        extra={
          <Button type="primary" onClick={() => (window.location.href = '/')}>Back Home</Button>
        }
      />
    )
  }

  return <>{children}</>
}
