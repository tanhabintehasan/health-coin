import { useSearchParams } from 'react-router-dom'

export function useQueryParam(key: string): string | null {
  const [searchParams] = useSearchParams()
  return searchParams.get(key)
}
