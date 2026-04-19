import { useState } from 'react'
import Taro, { useLaunch, useDidShow } from '@tarojs/taro'
import { useUserStore } from './store/user.store'
import { api } from './services/api'

function App(props) {
  const { children } = props
  const [initialized, setInitialized] = useState(false)
  const { setAuth, logout } = useUserStore()

  useLaunch(() => {
    console.log('HealthCoin Mini Program launched')
    initAuth()
  })

  const initAuth = async () => {
    try {
      const storedToken = Taro.getStorageSync('access_token')
      if (storedToken) {
        const user = await api.getMe()
        setAuth(user, storedToken)
      } else {
        const loginRes = await new Promise((resolve) => {
          Taro.login({ success: resolve, fail: () => resolve(null) })
        })
        if (loginRes && loginRes.code) {
          const res = await api.wxLogin(loginRes.code)
          if (res && res.accessToken) {
            setAuth(res.user, res.accessToken)
            Taro.setStorageSync('openId', res.openId)
          }
        }
      }
    } catch (err) {
      console.error('Auth init failed', err)
    } finally {
      setInitialized(true)
    }
  }

  useDidShow(() => {
    const token = Taro.getStorageSync('access_token')
    if (!token) return
    // Validate token by calling getMe; if 401, try to re-auth via wx.login
    api.getMe().catch(async () => {
      Taro.removeStorageSync('access_token')
      logout()
      try {
        const loginRes: any = await new Promise((resolve) => {
          Taro.login({ success: resolve, fail: () => resolve(null) })
        })
        if (loginRes && loginRes.code) {
          const res = await api.wxLogin(loginRes.code)
          if (res && res.accessToken) {
            setAuth(res.user, res.accessToken)
            Taro.setStorageSync('openId', res.openId)
          }
        }
      } catch (err) {
        console.error('Silent re-auth failed', err)
      }
    })
  })

  if (!initialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <span style={{ color: '#999' }}>Loading...</span>
      </div>
    )
  }

  return <>{children}</>
}

export default App
