import { Routes, Route, Navigate } from 'react-router-dom'
import { useUserStore } from './store/user.store'
import { UserLayout } from './layouts/UserLayout'
import AuthPage from './pages/auth'
import HomePage from './pages/home'
import ProductPage from './pages/product'
import CartPage from './pages/cart'
import OrderPage from './pages/order'
import OrderDetailPage from './pages/order/detail'
import WalletPage from './pages/wallet'
import ProfilePage from './pages/profile'
import ReferralPage from './pages/referral'
import HealthRecordsPage from './pages/health'

function RequireAuth({ children }: { children: JSX.Element }) {
  const token = useUserStore((s) => s.token)
  if (!token) {
    return <Navigate to="/auth" replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <UserLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="product" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="order-detail" element={<OrderDetailPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="referral" element={<ReferralPage />} />
        <Route path="health" element={<HealthRecordsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
