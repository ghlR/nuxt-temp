import type { PageDataOptions, PageDataReturn, RenderMode } from '~~/types/api'

declare module '#app' {
  interface PageMeta {
    renderMode?: RenderMode
    swr?: number
    staleIfError?: number
  }
}

const resolveRenderMode = (options?: PageDataOptions): { mode: RenderMode; swr: number; staleIfError: number } => {
  const route = useRoute()
  
  const metaMode = route.meta?.renderMode as RenderMode | undefined
  const metaSwr = route.meta?.swr as number | undefined
  const metaStaleIfError = route.meta?.staleIfError as number | undefined

  const mode = options?.renderMode ?? metaMode ?? 'ssr'
  const swr = options?.swr ?? metaSwr ?? 60
  const staleIfError = options?.staleIfError ?? metaStaleIfError ?? 300

  return { mode, swr, staleIfError }
}

const createThrottle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

export const usePageData = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: PageDataOptions
): PageDataReturn<T> => {
  const { mode, swr, staleIfError } = resolveRenderMode(options)
  const nuxtApp = useNuxtApp()

  const getCachedAt = (): number | null => {
    const payload = nuxtApp.payload as any
    return payload?.isrCache?.[key]?.fetchedAt ?? null
  }

  const checkStale = (): boolean => {
    const cachedAt = getCachedAt()
    if (!cachedAt) return true
    return (Date.now() - cachedAt) / 1000 > swr
  }

  const asyncDataOptions: any = {
    server: options?.server ?? (mode !== 'csr'),
    lazy: options?.lazy ?? (mode === 'csr'),
    dedupe: options?.dedupe ?? 'defer',
  }

  if (mode === 'isr') {
    asyncDataOptions.getCachedData = (dataKey: string) => {
      const payload = nuxtApp.payload as any
      const data = payload.data[dataKey]
      if (!data) return undefined

      const cachedAt = payload?.isrCache?.[dataKey]?.fetchedAt
      if (!cachedAt) return data

      const age = (Date.now() - cachedAt) / 1000
      if (age > staleIfError) return undefined

      return data
    }
  }

  const asyncData = useAsyncData<T>(
    key,
    async () => {
      try {
        const data = await fetcher()

        if (mode === 'isr') {
          const payload = nuxtApp.payload as any
          if (!payload.isrCache) payload.isrCache = {}
          payload.isrCache[key] = {
            fetchedAt: Date.now(),
            expiresAt: Date.now() + staleIfError * 1000
          }
        }

        return data
      } catch (error: any) {
        if (mode === 'isr') {
          const payload = nuxtApp.payload as any
          const cached = payload.data?.[key]
          if (cached) return cached as T
        }
        throw error
      }
    },
    asyncDataOptions
  )

  const refreshIfStale = async () => {
    if (mode === 'isr' && checkStale() && !asyncData.pending.value) {
      await asyncData.refresh()
    }
  }

  if (import.meta.client && mode === 'isr') {
    const throttledRefresh = createThrottle(() => {
      if (checkStale() && !asyncData.pending.value) {
        asyncData.refresh()
      }
    }, 5000)
    
    const visibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        throttledRefresh()
      }
    }
    
    onMounted(() => {
      document.addEventListener('visibilitychange', visibilityRefresh)
    })
    
    onUnmounted(() => {
      document.removeEventListener('visibilitychange', visibilityRefresh)
    })
  }

  return {
    data: asyncData.data as Ref<T | null>,
    pending: asyncData.pending,
    error: asyncData.error,
    refresh: asyncData.refresh,
    refreshIfStale,
    isStale: computed(checkStale),
    cachedAt: computed(() => {
      const at = getCachedAt()
      return at ? new Date(at).toLocaleString() : null
    }),
    renderMode: mode
  }
}
