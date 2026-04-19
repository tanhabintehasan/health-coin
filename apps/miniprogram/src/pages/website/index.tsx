import { WebView } from '@tarojs/components'

const BASE_URL = process.env.TARO_APP_API_URL || 'http://localhost:10000'

export default function WebsitePage() {
  return <WebView src={BASE_URL.replace('/api/v1', '')} />
}
