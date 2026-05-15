import { getHeader } from 'h3'

export interface IsrServerCacheEntry<T = any> {
  data: T
  fetchedAt: number
  expiresAt: number
}

const ISR_STORAGE_PREFIX = 'isr:'

const getStorage = () => {
  return useStorage('isr')
}

export const getIsrCache = async <T>(key: string): Promise<IsrServerCacheEntry<T> | null> => {
  const storage = getStorage()
  const cached = await storage.getItem<IsrServerCacheEntry<T>>(`${ISR_STORAGE_PREFIX}${key}`)
  
  if (!cached) return null
  
  if (Date.now() > cached.expiresAt) {
    await storage.removeItem(`${ISR_STORAGE_PREFIX}${key}`)
    return null
  }
  
  return cached
}

export const setIsrCache = async <T>(
  key: string, 
  data: T, 
  ttlSeconds: number = 60
): Promise<void> => {
  const storage = getStorage()
  const entry: IsrServerCacheEntry<T> = {
    data,
    fetchedAt: Date.now(),
    expiresAt: Date.now() + ttlSeconds * 1000
  }
  await storage.setItem(`${ISR_STORAGE_PREFIX}${key}`, entry)
}

export const getIsrCacheWithRevalidate = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    swr?: number
    staleIfError?: number
  } = {}
): Promise<{ data: T; isStale: boolean; revalidated: boolean }> => {
  const { swr = 60, staleIfError = 300 } = options
  const storage = getStorage()
  
  const cached = await storage.getItem<IsrServerCacheEntry<T>>(`${ISR_STORAGE_PREFIX}${key}`)
  const now = Date.now()
  
  if (cached) {
    const age = (now - cached.fetchedAt) / 1000
    
    if (age <= swr) {
      return { data: cached.data, isStale: false, revalidated: false }
    }
    
    if (age <= staleIfError) {
      try {
        const freshData = await fetcher()
        await setIsrCache(key, freshData, swr)
        return { data: freshData, isStale: false, revalidated: true }
      } catch {
        return { data: cached.data, isStale: true, revalidated: false }
      }
    }
  }
  
  try {
    const freshData = await fetcher()
    await setIsrCache(key, freshData, swr)
    return { data: freshData, isStale: false, revalidated: true }
  } catch (error: any) {
    if (cached) {
      return { data: cached.data, isStale: true, revalidated: false }
    }
    throw error
  }
}

export const invalidateIsrCache = async (key: string): Promise<void> => {
  const storage = getStorage()
  await storage.removeItem(`${ISR_STORAGE_PREFIX}${key}`)
}

export const invalidateIsrCacheByPattern = async (pattern: string): Promise<void> => {
  const storage = getStorage()
  const keys = await storage.getKeys(`${ISR_STORAGE_PREFIX}`)
  for (const k of keys) {
    if (k.includes(pattern)) {
      await storage.removeItem(k)
    }
  }
}

export const useIsrServerApi = (event: any) => {
  const getAccessToken = (): string | undefined => {
    const cookieHeader = getHeader(event, 'cookie') || ''
    const match = cookieHeader.match(/access_token=([^;]+)/)
    return match ? match[1] : undefined
  }

  return {
    getAccessToken,
    getIsrCache,
    setIsrCache,
    getIsrCacheWithRevalidate,
    invalidateIsrCache,
    invalidateIsrCacheByPattern
  }
}
