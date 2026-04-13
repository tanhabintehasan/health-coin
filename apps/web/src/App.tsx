import { useEffect } from 'react'
import { useAuthStore } from './store/auth.store'
import { AppRoutes } from './routes'

export default function App() {
  const init = useAuthStore((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  return <AppRoutes />
}
