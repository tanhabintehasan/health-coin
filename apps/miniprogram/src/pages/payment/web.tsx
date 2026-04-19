import { WebView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'

export default function PaymentWebPage() {
  const router = useRouter()
  const payUrl = decodeURIComponent((router.params.url as string) || '')
  return <WebView src={payUrl} />
}
