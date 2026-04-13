import { useEffect } from 'react'

// Mimics Taro useDidShow by running callback on mount and when tab becomes visible
export function usePageVisible(callback: () => void) {
  useEffect(() => {
    callback()
    const handler = () => {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [callback])
}
