import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'
import { AppRoutes } from './routes'

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    const onLogout = () => {
      useAuthStore.getState().logout()
    }
    window.addEventListener('healthcoin:logout', onLogout)
    return () => window.removeEventListener('healthcoin:logout', onLogout)
  }, [])

  return <AppRoutes />
}
