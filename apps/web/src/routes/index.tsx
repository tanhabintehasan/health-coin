import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoadingFallback } from '../components/common/LoadingFallback'
import { ProtectedRoute } from '../components/guards/ProtectedRoute'
import { RoleRoute } from '../components/guards/RoleRoute'

const HomePage = lazy(() => import('../pages/home/HomePage'))
const LoginPage = lazy(() => import('../pages/login/LoginPage'))

const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const AdminDashboard = lazy(() => import('../pages/admin/DashboardPage'))
const AdminUsers = lazy(() => import('../pages/admin/UsersPage'))
const AdminMerchants = lazy(() => import('../pages/admin/MerchantsPage'))
const AdminProducts = lazy(() => import('../pages/admin/ProductsPage'))
const AdminOrders = lazy(() => import('../pages/admin/OrdersPage'))
const AdminWithdrawals = lazy(() => import('../pages/admin/WithdrawalsPage'))
const AdminMembership = lazy(() => import('../pages/admin/MembershipPage'))
const AdminSettings = lazy(() => import('../pages/admin/SettingsPage'))
const AdminRedemption = lazy(() => import('../pages/admin/RedemptionPage'))

const MerchantLayout = lazy(() => import('../layouts/MerchantLayout'))
const MerchantDashboard = lazy(() => import('../pages/merchant/DashboardPage'))
const MerchantProducts = lazy(() => import('../pages/merchant/ProductsPage'))
const MerchantOrders = lazy(() => import('../pages/merchant/OrdersPage'))
const MerchantRedemption = lazy(() => import('../pages/merchant/RedemptionPage'))

const UserLayout = lazy(() => import('../layouts/UserLayout'))
const UserHome = lazy(() => import('../pages/user/HomePage'))
const UserProductDetail = lazy(() => import('../pages/user/ProductDetailPage'))
const UserCart = lazy(() => import('../pages/user/CartPage'))
const UserOrders = lazy(() => import('../pages/user/OrdersPage'))
const UserOrderDetail = lazy(() => import('../pages/user/OrderDetailPage'))
const UserWallet = lazy(() => import('../pages/user/WalletPage'))
const UserProfile = lazy(() => import('../pages/user/ProfilePage'))
const UserReferral = lazy(() => import('../pages/user/ReferralPage'))
const UserHealth = lazy(() => import('../pages/user/HealthPage'))

function withSuspense(Element: React.LazyExoticComponent<any>, props?: any) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Element {...props} />
    </Suspense>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={withSuspense(HomePage)} />
      <Route path="/login" element={withSuspense(LoginPage)} />

      <Route
        path="/portal/admin/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['admin']}>
              <Suspense fallback={<LoadingFallback />}>
                <AdminLayout />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(AdminDashboard)} />
        <Route path="users" element={withSuspense(AdminUsers)} />
        <Route path="merchants" element={withSuspense(AdminMerchants)} />
        <Route path="products" element={withSuspense(AdminProducts)} />
        <Route path="orders" element={withSuspense(AdminOrders)} />
        <Route path="withdrawals" element={withSuspense(AdminWithdrawals)} />
        <Route path="membership" element={withSuspense(AdminMembership)} />
        <Route path="redemption" element={withSuspense(AdminRedemption)} />
        <Route path="settings" element={withSuspense(AdminSettings)} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/portal/merchant/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['merchant']}>
              <Suspense fallback={<LoadingFallback />}>
                <MerchantLayout />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={withSuspense(MerchantDashboard)} />
        <Route path="products" element={withSuspense(MerchantProducts)} />
        <Route path="orders" element={withSuspense(MerchantOrders)} />
        <Route path="redemption" element={withSuspense(MerchantRedemption)} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route
        path="/portal/user/*"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['user']}>
              <Suspense fallback={<LoadingFallback />}>
                <UserLayout />
              </Suspense>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={withSuspense(UserHome)} />
        <Route path="product/:id" element={withSuspense(UserProductDetail)} />
        <Route path="cart" element={withSuspense(UserCart)} />
        <Route path="orders" element={withSuspense(UserOrders)} />
        <Route path="order/:id" element={withSuspense(UserOrderDetail)} />
        <Route path="wallet" element={withSuspense(UserWallet)} />
        <Route path="profile" element={withSuspense(UserProfile)} />
        <Route path="referral" element={withSuspense(UserReferral)} />
        <Route path="health" element={withSuspense(UserHealth)} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
