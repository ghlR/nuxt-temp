export interface BaseResponse<T> {
  code: number
  message: string
  data: T
}

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public status?: number,
    public data?: any,
    public isNetworkError: boolean = false,
    public isTimeout: boolean = false
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static fromError(error: any): ApiError {
    if (error instanceof ApiError) return error
    
    const isTimeout = error?.name === 'AbortError' || error?.message?.includes('timeout')
    const isNetwork = !error?.response && !isTimeout
    
    return new ApiError(
      error?.response?._data?.code || 0,
      error?.response?._data?.message || error?.message || '未知错误',
      error?.response?.status,
      error?.response?._data,
      isNetwork,
      isTimeout
    )
  }
}

export type RenderMode = 'ssr' | 'isr' | 'csr'

export interface ApiOptions extends Omit<RequestInit, 'body' | 'cache'> { 
  showLoading?: boolean
  silentError?: boolean
  onError?: (error: unknown) => void
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
  body?: BodyInit | Record<string, unknown> | FormData | URLSearchParams | Blob | ArrayBufferView | ArrayBuffer | ReadableStream
  params?: Record<string, string | number | boolean | undefined | null | Array<string | number | boolean>>
  timeout?: number
  signal?: AbortSignal
  retry?: number
  retryDelay?: number
  retryCondition?: (error: ApiError) => boolean
  cache?: boolean
  cacheTime?: number
  swr?: number
  staleIfError?: number
  noCache?: boolean
}

export interface PageDataOptions {
  renderMode?: RenderMode
  swr?: number
  staleIfError?: number
  server?: boolean
  lazy?: boolean
  dedupe?: 'cancel' | 'defer'
  silentError?: boolean
}

export interface PageDataReturn<T> {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<any>
  refresh: (opts?: any) => Promise<void>
  refreshIfStale: () => Promise<void>
  isStale: Ref<boolean>
  cachedAt: Ref<string | null>
  renderMode: RenderMode
}
