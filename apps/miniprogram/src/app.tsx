import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('HealthCoin Mini Program launched')
  })
  return <>{children}</>
}

export default App
