import { 
  defineEventHandler, 
  getHeaders,  
  getMethod, 
  readBody, 
  getRequestURL, 
  setHeader,
  createError, 
  H3Error
} from 'h3'
import { useRuntimeConfig } from '#imports'
import { parseCachePolicy, buildCacheHeaders } from '../utils/cache-policy'
import { 
  getIsrCacheWithRevalidate,
  invalidateIsrCacheByPattern 
} from '../utils/isr'

const TIMEOUT = 30000

const fetchWithTimeout = async (url: string, options: any, timeout: number) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        message: 'Backend Request Timeout'
      })
    }
    throw error
  }
}

const buildForwardHeaders = (headers: Record<string, any>): Record<string, string> => {
  const forwardHeaders: Record<string, string> = {
    'Content-Type': headers['content-type'] || 'application/json',
  }
  
  if (headers.authorization) {
    forwardHeaders.Authorization = headers.authorization as string
  } else if (headers.cookie) {
    const accessTokenMatch = (headers.cookie as string).match(/access_token=([^;]+)/)
    if (accessTokenMatch) {
      forwardHeaders.Authorization = `Bearer ${accessTokenMatch[1]}`
    }
  }
  
  return forwardHeaders
}

export default defineEventHandler(async (event: any) => {
  const config = useRuntimeConfig()
  const backendBase = config.apiBase
  const url = getRequestURL(event)
  const path = url.pathname.replace(/^\/api/, '')
  const targetUrl = `${backendBase}${path}${url.search}`
  const headers = getHeaders(event)
  const method = getMethod(event)
  
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const startTime = performance.now()

  if (method === 'DELETE' && headers['x-cache-invalidate'] === 'true') {
    const pattern = headers['x-cache-pattern'] as string || path
    await invalidateIsrCacheByPattern(pattern)
    return { code: 200, message: '缓存已清除', data: null }
  }

  const cachePolicy = parseCachePolicy(event, path)
  
  if (import.meta.dev) {
    console.log(`[Server API ${requestId}] ${method} ${targetUrl}`, {
      cache: cachePolicy.enabled ? `swr=${cachePolicy.swr}s` : 'disabled'
    })
  }

  const forwardHeaders = buildForwardHeaders(headers)

  let body: any = undefined
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await readBody(event)
    } catch (error) {
      if (import.meta.dev) {
        console.error(`[Server API ${requestId}] Failed to read body:`, error)
      }
    }
  }

  const fetchBackend = async () => {
    const res = await fetchWithTimeout(targetUrl, {
      method,
      headers: forwardHeaders,
      body: body ? JSON.stringify(body) : undefined,
    }, TIMEOUT)

    if (!res.ok) {
      let errorData: any = null
      try {
        errorData = await res.json()
      } catch {
        errorData = { message: res.statusText }
      }
      
      throw createError({
        statusCode: res.status,
        message: errorData?.message || res.statusText,
        data: errorData
      })
    }

    return await res.json()
  }

  try {
    let data: any
    let isStale = false
    let revalidated = false

    if (cachePolicy.enabled) {
      const result = await getIsrCacheWithRevalidate(
        cachePolicy.key,
        fetchBackend,
        { swr: cachePolicy.swr, staleIfError: cachePolicy.staleIfError }
      )
      data = result.data
      isStale = result.isStale
      revalidated = result.revalidated

      const cacheHeaders = buildCacheHeaders(cachePolicy, isStale, revalidated)
      for (const [key, value] of Object.entries(cacheHeaders)) {
        setHeader(event, key, value)
      }
    } else {
      data = await fetchBackend()
    }

    if (import.meta.dev) {
      const duration = performance.now() - startTime
      console.log(`[Server API ${requestId}] Success (${duration.toFixed(2)}ms)`, {
        cached: cachePolicy.enabled && !revalidated,
        stale: isStale
      })
    }
    
    return data
  } catch (error: any) {
    const duration = performance.now() - startTime
    
    if (error instanceof H3Error) {
      if (import.meta.dev) {
        console.error(`[Server API ${requestId}] H3Error:`, error.message, `(${duration.toFixed(2)}ms)`)
      }
      throw error
    }
    
    if (import.meta.dev) {
      console.error(`[Server API ${requestId}] Unexpected Error:`, error.message, `(${duration.toFixed(2)}ms)`)
    }
    
    throw createError({
      statusCode: 500,
      message: error.message || 'Backend Connection Failed',
      data: {
        requestId,
        duration: duration.toFixed(2),
        timestamp: new Date().toISOString()
      }
    })
  }
})
