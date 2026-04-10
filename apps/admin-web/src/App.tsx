import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import LoginPage from './pages/login/LoginPage'
import AdminLayout from './layouts/AdminLayout'
import DashboardPage from './pages/dashboard/DashboardPage'
import UsersPage from './pages/users/UsersPage'
import MerchantsPage from './pages/merchants/MerchantsPage'
import OrdersPage from './pages/orders/OrdersPage'
import WithdrawalsPage from './pages/withdrawals/WithdrawalsPage'
import MembershipPage from './pages/membership/MembershipPage'
import SystemConfigPage from './pages/settings/SystemConfigPage'
import ProductReviewPage from './pages/products/ProductReviewPage'
import RedemptionLogsPage from './pages/redemption/RedemptionLogsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="merchants" element={<MerchantsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="withdrawals" element={<WithdrawalsPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="settings" element={<SystemConfigPage />} />
        <Route path="products/review" element={<ProductReviewPage />} />
        <Route path="redemption" element={<RedemptionLogsPage />} />
      </Route>
    </Routes>
  )
}
