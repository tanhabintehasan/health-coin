import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000/api/v1'
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('merchant_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('merchant_token')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data?.message ?? 'Request failed')
  }
)

export default client
