import { useCallback } from 'react'

export function useToast() {
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple alert fallback for web; in production replace with a toast library
    if (type === 'error') {
      alert(`Error: ${message}`)
    } else if (type === 'success') {
      alert(message)
    } else {
      alert(message)
    }
  }, [])

  return { showToast }
}
