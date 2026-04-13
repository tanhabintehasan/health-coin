import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/cart', label: 'Cart', icon: '🛒' },
  { path: '/orders', label: 'Orders', icon: '📦' },
  { path: '/wallet', label: 'Wallet', icon: '💰' },
  { path: '/profile', label: 'Profile', icon: '👤' },
]

export function UserLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, paddingBottom: '70px' }}>
        <Outlet />
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: '#fff',
          borderTop: '1px solid #e8e8e8',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 50,
        }}
      >
        {tabs.map((tab) => {
          const active = location.pathname === tab.path
          return (
            <div
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: active ? '#1677ff' : '#999',
                fontSize: '11px',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '20px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
