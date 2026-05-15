import { getHeader, getMethod } from 'h3'

export interface CachePolicy {
  enabled: boolean
  swr: number
  staleIfError: number
  key: string
}

const DEFAULT_SWR = 60
const DEFAULT_STALE_IF_ERROR = 300

export const parseCachePolicy = (event: any, path: string): CachePolicy => {
  const method = getMethod(event)
  
  if (method !== 'GET') {
    return { enabled: false, swr: 0, staleIfError: 0, key: '' }
  }

  const cacheStrategyHeader = getHeader(event, 'x-cache-strategy')
  const swrHeader = getHeader(event, 'x-cache-swr')
  const staleIfErrorHeader = getHeader(event, 'x-cache-stale-if-error')
  const noCacheHeader = getHeader(event, 'x-no-cache')

  if (noCacheHeader === 'true' || noCacheHeader === '1') {
    return { enabled: false, swr: 0, staleIfError: 0, key: '' }
  }

  let swr = DEFAULT_SWR
  let staleIfError = DEFAULT_STALE_IF_ERROR

  if (cacheStrategyHeader) {
    try {
      const strategy = JSON.parse(cacheStrategyHeader as string)
      swr = strategy.swr ?? DEFAULT_SWR
      staleIfError = strategy.staleIfError ?? DEFAULT_STALE_IF_ERROR
    } catch {
      swr = DEFAULT_SWR
      staleIfError = DEFAULT_STALE_IF_ERROR
    }
  } else {
    swr = parseInt(swrHeader as string) || DEFAULT_SWR
    staleIfError = parseInt(staleIfErrorHeader as string) || DEFAULT_STALE_IF_ERROR
  }

  const url = getRequestURL(event)
  const key = `api:${path}:${url.search}`

  return {
    enabled: true,
    swr,
    staleIfError,
    key
  }
}

export const buildCacheHeaders = (policy: CachePolicy, isStale: boolean, revalidated: boolean): Record<string, string> => {
  return {
    'X-Cache-Status': isStale ? 'STALE' : 'FRESH',
    'X-Cache-Revalidated': revalidated ? 'true' : 'false',
    'Cache-Control': `s-maxage=${policy.swr}, stale-while-revalidate=${policy.staleIfError}`,
    'CDN-Cache-Control': `s-maxage=${policy.swr}`,
    'Vercel-CDN-Cache-Control': `s-maxage=${policy.swr}, stale-while-revalidate=${policy.staleIfError}`
  }
}
