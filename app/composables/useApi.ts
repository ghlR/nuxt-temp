import type { BaseResponse, ApiOptions } from '~~/types/api'
import { ApiError } from '~~/types/api'

interface RefreshState {
  isRefreshing: boolean
  subscribers: Array<(token: string) => void>
  errorSubscribers: Array<() => void>
}

const createRefreshState = (): RefreshState => ({
  isRefreshing: false,
  subscribers: [],
  errorSubscribers: []
})

const globalRefreshState = typeof window !== 'undefined' 
  ? createRefreshState() 
  : null

const onRefreshed = (token: string) => {
  if (!globalRefreshState) return
  globalRefreshState.subscribers.forEach(cb => cb(token))
  globalRefreshState.subscribers = []
  globalRefreshState.errorSubscribers = []
}

const onRefreshFailed = () => {
  if (!globalRefreshState) return
  globalRefreshState.errorSubscribers.forEach(cb => cb())
  globalRefreshState.subscribers = []
  globalRefreshState.errorSubscribers = []
}

const addRefreshSubscriber = (cb: (token: string) => void, onError: () => void) => {
  if (!globalRefreshState) return
  globalRefreshState.subscribers.push(cb)
  globalRefreshState.errorSubscribers.push(onError)
}

interface CacheEntry {
  data: any
  timestamp: number
}

const MAX_CACHE_SIZE = 100
const CACHE_CLEANUP_INTERVAL = 60000

class SimpleLRUCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private destroyed = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.cleanupTimer = setInterval(() => this.cleanup(), CACHE_CLEANUP_INTERVAL)
      window.addEventListener('beforeunload', () => this.destroy(), { once: true })
    }
  }

  get(key: string): CacheEntry | undefined {
    if (this.destroyed) return undefined
    return this.cache.get(key)
  }

  set(key: string, value: CacheEntry): void {
    if (this.destroyed) return
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): IterableIterator<string> {
    return this.cache.keys()
  }

  private cleanup(): void {
    if (this.destroyed) return
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_CLEANUP_INTERVAL) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.cache.clear()
  }
}

const clientRequestCache = typeof window !== 'undefined' 
  ? new SimpleLRUCache()
  : null

const isNetworkError = (error: any): boolean => {
  return !error?.response && error?.name !== 'AbortError' && !error?.message?.includes('timeout')
}

const isServerError = (error: any): boolean => {
  return error?.response?.status >= 500
}

const getSsrCookie = (): string | undefined => {
  if (!import.meta.server) return undefined
  try {
    const event = useRequestEvent()
    if (event) {
      return getHeader(event, 'cookie') || undefined
    }
  } catch { /* empty */ }
  return undefined
}

const safeStringify = (obj: any): string => {
  try {
    if (obj instanceof FormData) {
      const entries: string[] = []
      obj.forEach((value, key) => {
        entries.push(`${key}=${typeof value === 'string' ? value : '[File]'}`)
      })
      return `FormData:${entries.join(',')}`
    }
    return JSON.stringify(obj)
  } catch {
    return String(Date.now())
  }
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const toast = useToast()
  const router = useRouter()

  const tokenCookie = useCookie('access_token')
  const refreshTokenCookie = useCookie('refresh_token')
  
  const getToken = () => tokenCookie.value
  const setToken = (token: string) => { tokenCookie.value = token }
  const clearToken = () => {
    tokenCookie.value = null
    refreshTokenCookie.value = null
  }

  const handleRefreshToken = async () => {
    if (!refreshTokenCookie.value) {
      throw new ApiError(0, '没有刷新token可用', 401)
    }
    
    try {
      const res = await $fetch<BaseResponse<{ accessToken: string, refreshToken: string }>>('/api/auth/refresh', {
        method: 'post',
        body: { refreshToken: refreshTokenCookie.value },
        headers: getSsrCookie() ? { cookie: getSsrCookie()! } : {}
      })
      
      if (res.code === 200 && res.data.accessToken) {
        setToken(res.data.accessToken)
        if (res.data.refreshToken) refreshTokenCookie.value = res.data.refreshToken
        return res.data.accessToken
      } else {
        throw new ApiError(res.code, res.message || 'Refresh token failed', 401)
      }
    } catch (error: any) {
      clearToken()
      if (import.meta.client) {
        router.push('/login')
      }
      throw ApiError.fromError(error)
    }
  }

  const clearCache = (pattern?: string) => {
    if (!clientRequestCache) return
    if (pattern) {
      for (const key of clientRequestCache.keys()) {
        if (key.includes(pattern)) {
          clientRequestCache.delete(key)
        }
      }
    } else {
      clientRequestCache.clear()
    }
  }

  const invalidateServerCache = async (pattern: string) => {
    await $fetch('/api' + pattern, {
      method: 'DELETE',
      headers: {
        'x-cache-invalidate': 'true',
        'x-cache-pattern': pattern
      }
    })
  }

  const buildHeaders = (
    fetchOptions: any, 
    token: string | null | undefined, 
    cacheOptions?: { swr?: number; staleIfError?: number; noCache?: boolean },
    isFormData?: boolean
  ) => {
    const headers: Record<string, string> = {
      ...fetchOptions.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    }
    
    if (!isFormData) {
      headers['Content-Type'] = 'application/json'
    }
    
    if (cacheOptions?.noCache) {
      headers['x-no-cache'] = 'true'
    } else if (cacheOptions?.swr !== undefined) {
      headers['x-cache-swr'] = String(cacheOptions.swr)
      if (cacheOptions.staleIfError !== undefined) {
        headers['x-cache-stale-if-error'] = String(cacheOptions.staleIfError)
      }
    }
    
    const ssrCookie = getSsrCookie()
    if (ssrCookie) {
      headers.cookie = ssrCookie
    }
    
    return headers
  }

  const request = async <T>(url: string, options: ApiOptions = {}): Promise<T> => {
    const {
      silentError = false,
      timeout = 30000,
      signal: externalSignal,
      retry = 0,
      retryDelay = 1000,
      retryCondition,
      cache: useCache = false,
      cacheTime = 5 * 60 * 1000,
      method,
      ...fetchOptions
    } = options

    const isFormData = fetchOptions.body instanceof FormData
    const cacheKey = `${method || 'GET'}:${url}:${safeStringify(options.params || (isFormData ? fetchOptions.body : options.body))}`
    
    if (useCache && method === 'GET' && clientRequestCache) {
      const cached = clientRequestCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data as T
      }
    }

    const executeRequest = async (attempt: number = 0, overrideToken?: string): Promise<T> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      let abortHandler: (() => void) | null = null
      if (externalSignal) {
        abortHandler = () => controller.abort()
        externalSignal.addEventListener('abort', abortHandler)
      }

      const startTime = performance.now()
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      if (import.meta.dev) {
        console.log(`[API Request ${requestId}]`, {
          url,
          method: method || 'GET',
          attempt: attempt + 1,
          ssr: import.meta.server,
          params: options.params,
          body: isFormData ? 'FormData' : options.body
        })
      }

      const cacheOptions = {
        swr: options.swr,
        staleIfError: options.staleIfError,
        noCache: options.noCache
      }

      const currentToken = overrideToken ?? getToken()

      const cleanup = () => {
        clearTimeout(timeoutId)
        if (abortHandler && externalSignal) {
          externalSignal.removeEventListener('abort', abortHandler)
        }
      }

      try {
        const res = await $fetch<BaseResponse<T>>(url, {
          baseURL: config.public.baseApi,
          method: method || 'GET',
          ...fetchOptions,
          signal: controller.signal,
          headers: buildHeaders(fetchOptions, currentToken, cacheOptions, isFormData),
          onResponseError({ response }) {
            if (silentError || import.meta.server) return
            
            const status = response.status
            const msg = response._data?.message || '网络请求异常'
            
            if (status === 403) {
              toast.add({ title: '没有权限', color: 'error' })
            } else if (status >= 500) {
              toast.add({ title: '服务器内部错误', color: 'error' })
            } else if (status !== 401) {
              toast.add({ title: msg, color: 'error' })
            }
          }
        })

        cleanup()

        if (res.code !== 200) {
          const err = new ApiError(res.code, res.message || '业务处理失败')
          if (!silentError && import.meta.client) toast.add({ title: res.message, color: 'error' })
          throw err
        }

        const duration = performance.now() - startTime
        if (import.meta.dev) {
          console.log(`[API Response ${requestId}]`, { 
            duration: `${duration.toFixed(2)}ms`, 
            result: res.data 
          })
        }

        if (duration > 3000) {
          console.warn(`[API Slow Request] ${url} took ${duration.toFixed(2)}ms`)
        }

        if (useCache && method === 'GET' && clientRequestCache) {
          clientRequestCache.set(cacheKey, { data: res.data, timestamp: Date.now() })
        }

        return res.data as T
      } catch (error: any) {
        cleanup()
        const duration = performance.now() - startTime
        const apiError = ApiError.fromError(error)
        
        if (import.meta.dev) {
          console.error(`[API Error ${requestId}]`, { 
            duration: `${duration.toFixed(2)}ms`, 
            error: apiError 
          })
        }

        if (error?.response?.status === 401 && attempt === 0 && import.meta.client && globalRefreshState) {
          if (!globalRefreshState.isRefreshing) {
            globalRefreshState.isRefreshing = true
            try {
              const newToken = await handleRefreshToken()
              globalRefreshState.isRefreshing = false
              onRefreshed(newToken)
              return executeRequest(attempt + 1, newToken)
            } catch (refreshErr) {
              globalRefreshState.isRefreshing = false
              onRefreshFailed()
              throw refreshErr
            }
          } else {
            return new Promise((resolve, reject) => {
              let settled = false
              
              const onSuccess = async (newToken: string) => {
                if (settled) return
                settled = true
                try {
                  const result = await executeRequest(attempt + 1, newToken)
                  resolve(result)
                } catch (e) {
                  reject(ApiError.fromError(e))
                }
              }
              
              const onFailed = () => {
                if (settled) return
                settled = true
                reject(new ApiError(0, 'Token refresh failed', 401))
              }
              
              addRefreshSubscriber(onSuccess, onFailed)
            })
          }
        }

        const shouldRetry = attempt < retry && (
          retryCondition?.(apiError) || 
          isNetworkError(error) || 
          isServerError(error)
        )

        if (shouldRetry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)))
          return executeRequest(attempt + 1, overrideToken)
        }

        if (!silentError) {
          console.error('API Request Failed:', apiError)
        }
        
        throw apiError
      }
    }

    return executeRequest()
  }

  return {
    get: <T>(url: string, params?: any, options?: ApiOptions) => 
      request<T>(url, { method: 'GET', params, ...options }),

    post: <T>(url: string, body?: any, options?: ApiOptions) => 
      request<T>(url, { method: 'POST', body, ...options }),
    
    put: <T>(url: string, body?: any, options?: ApiOptions) => 
      request<T>(url, { method: 'PUT', body, ...options }),

    delete: <T>(url: string, options?: ApiOptions) => 
      request<T>(url, { method: 'DELETE', ...options }),
    
    setToken,
    getToken,
    clearToken,
    clearCache,
    invalidateServerCache,
    
    upload: async <T>(
      url: string, 
      file: File | File[],
      options: ApiOptions & { fieldName?: string } = {}
    ): Promise<T> => {
      const { fieldName = 'file', ...restOptions } = options
      const formData = new FormData()
      
      if (Array.isArray(file)) {
        file.forEach(f => formData.append(fieldName, f))
      } else {
        formData.append(fieldName, file)
      }
      
      return request<T>(url, {
        ...restOptions,
        method: 'POST',
        body: formData
      })
    },

    download: async (
      url: string, 
      options: ApiOptions & { filename?: string } = {}
    ): Promise<void> => {
      if (import.meta.server) return
      
      const response = await fetch(`${config.public.baseApi}${url}`, {
        method: options.method || 'GET',
        headers: {
          'Authorization': getToken() ? `Bearer ${getToken()}` : ''
        }
      })
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = options.filename || 'download'
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
    }
  }
}
