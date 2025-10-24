import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheItem<T> {
  data: T
  timestamp: number
  expiresAt?: number
  accessCount: number
  lastAccessed: number
}

interface CacheOptions {
  maxSize?: number // 最大缓存条目数
  maxAge?: number // 缓存最大年龄(ms)
  ttl?: number // 生存时间(ms)
  enableMemoryManagement?: boolean // 是否启用内存管理
}

interface CacheStats {
  hits: number
  misses: number
  size: number
  totalAccesses: number
}

// 默认配置
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  maxSize: 100,
  maxAge: 30 * 60 * 1000, // 30分钟
  ttl: 5 * 60 * 1000, // 5分钟
  enableMemoryManagement: true
}

export function useCache<T = unknown>(key: string, options: CacheOptions = {}): {
  get: (cacheKey?: string) => T | null
  set: (value: T, cacheKey?: string, ttl?: number) => void
  remove: (cacheKey?: string) => void
  clear: () => void
  has: (cacheKey?: string) => boolean
  size: () => number
  keys: () => string[]
  getStats: () => CacheStats
  preload: (fetcher: () => Promise<T>, cacheKey?: string, ttl?: number) => Promise<T>
  cacheImage: (url: string) => Promise<string>
  cacheApiResponse: <R = T>(url: string, fetcher: () => Promise<R>, ttl?: number) => Promise<R>
  cache: Map<string, CacheItem<T>>
  stats: CacheStats
} {
  const config = { ...DEFAULT_CACHE_OPTIONS, ...options }
  const [cache, setCache] = useState<Map<string, CacheItem<T>>>(new Map())
  const [stats, setStats] = useState<CacheStats>({ hits: 0, misses: 0, size: 0, totalAccesses: 0 })
  
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map())
  const statsRef = useRef<CacheStats>({ hits: 0, misses: 0, size: 0, totalAccesses: 0 })

  // 清理过期缓存
  const cleanExpired = useCallback(() => {
    const now = Date.now()
    const newCache = new Map<string, CacheItem<T>>()
    
    for (const [cacheKey, item] of cacheRef.current.entries()) {
      const isExpired = item.expiresAt && now > item.expiresAt
      const isTooOld = item.timestamp && (now - item.timestamp) > config.maxAge
      
      if (!isExpired && !isTooOld) {
        newCache.set(cacheKey, item)
      }
    }
    
    if (newCache.size !== cacheRef.current.size) {
      cacheRef.current = newCache
      setCache(new Map(newCache))
    }
  }, [config.maxAge])

  // 清理最少使用的缓存项
  const cleanLRU = useCallback(() => {
    if (cacheRef.current.size <= config.maxSize) return
    
    const items = Array.from(cacheRef.current.entries())
    items.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
    
    const toRemove = items.slice(0, cacheRef.current.size - config.maxSize)
    const newCache = new Map(cacheRef.current)
    
    for (const [cacheKey] of toRemove) {
      newCache.delete(cacheKey)
    }
    
    cacheRef.current = newCache
    setCache(new Map(newCache))
  }, [config.maxSize])

  // 内存管理
  const manageMemory = useCallback(() => {
    if (!config.enableMemoryManagement) return
    
    const usedMemory = (performance as any).memory?.usedJSHeapSize || 0
    const memoryLimit = (performance as any).memory?.jsHeapSizeLimit || 0
    const memoryUsagePercent = (usedMemory / memoryLimit) * 100
    
    // 如果内存使用超过80%，清理缓存
    if (memoryUsagePercent > 80) {
      console.log(`🧠 内存使用率过高 (${memoryUsagePercent.toFixed(1)}%)，清理缓存`)
      cacheRef.current.clear()
      setCache(new Map())
    } else {
      cleanExpired()
      cleanLRU()
    }
  }, [config.enableMemoryManagement, cleanExpired, cleanLRU])

  // 定期清理
  useEffect(() => {
    const interval = setInterval(() => {
      manageMemory()
    }, 60000) // 每分钟清理一次

    return () => clearInterval(interval)
  }, [manageMemory])

  // 监控内存使用
  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024)
        
        if (usedMB > 100) { // 100MB阈值
          console.log(`💾 内存使用监控: ${usedMB}MB / ${totalMB}MB`)
        }
      }
    }

    const interval = setInterval(checkMemory, 300000) // 每5分钟检查一次
    return () => clearInterval(interval)
  }, [])

  // 获取缓存
  const get = useCallback((cacheKey?: string): T | null => {
    const key = cacheKey || 'default'
    const item = cacheRef.current.get(key)
    
    if (!item) {
      statsRef.current.misses++
      statsRef.current.totalAccesses++
      setStats({ ...statsRef.current, size: cacheRef.current.size })
      return null
    }

    // 检查是否过期
    const now = Date.now()
    const isExpired = item.expiresAt && now > item.expiresAt
    const isTooOld = (now - item.timestamp) > config.maxAge

    if (isExpired || isTooOld) {
      cacheRef.current.delete(key)
      setCache(new Map(cacheRef.current))
      statsRef.current.misses++
      statsRef.current.totalAccesses++
      setStats({ ...statsRef.current, size: cacheRef.current.size })
      return null
    }

    // 更新访问信息
    item.accessCount++
    item.lastAccessed = now
    
    statsRef.current.hits++
    statsRef.current.totalAccesses++
    setStats({ ...statsRef.current, size: cacheRef.current.size })
    
    return item.data
  }, [config.maxAge])

  // 设置缓存
  const set = useCallback((value: T, cacheKey?: string, ttl?: number) => {
    const key = cacheKey || 'default'
    const now = Date.now()
    
    const item: CacheItem<T> = {
      data: value,
      timestamp: now,
      expiresAt: ttl ? now + ttl : undefined,
      accessCount: 0,
      lastAccessed: now
    }

    cacheRef.current.set(key, item)
    setCache(new Map(cacheRef.current))
    
    // 内存管理
    if (config.enableMemoryManagement) {
      manageMemory()
    }
  }, [config.enableMemoryManagement, manageMemory])

  // 删除缓存
  const remove = useCallback((cacheKey?: string) => {
    const key = cacheKey || 'default'
    cacheRef.current.delete(key)
    setCache(new Map(cacheRef.current))
  }, [])

  // 清空缓存
  const clear = useCallback(() => {
    cacheRef.current.clear()
    setCache(new Map())
  }, [])

  // 检查缓存是否存在
  const has = useCallback((cacheKey?: string): boolean => {
    const key = cacheKey || 'default'
    return cacheRef.current.has(key)
  }, [])

  // 获取缓存大小
  const size = useCallback((): number => {
    return cacheRef.current.size
  }, [])

  // 获取所有缓存键
  const keys = useCallback((): string[] => {
    return Array.from(cacheRef.current.keys())
  }, [])

  // 获取缓存统计
  const getStats = useCallback((): CacheStats => {
    return { ...statsRef.current, size: cacheRef.current.size }
  }, [])

  // 预加载数据
  const preload = useCallback(async (
    fetcher: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> => {
    const key = cacheKey || 'default'
    
    // 检查是否已有缓存
    const cached = get(cacheKey)
    if (cached !== null) {
      return cached
    }

    // 获取数据并缓存
    const data = await fetcher()
    set(data, key, ttl)
    return data
  }, [get, set])

  // 缓存图片
  const cacheImage = useCallback(async (url: string): Promise<string> => {
    const imageFetcher = async (): Promise<T> => {
      const response = await fetch(url)
      const blob = await response.blob()
      return URL.createObjectURL(blob) as unknown as T
    }
    return preload(imageFetcher, `image_${url}`, config.ttl) as Promise<string>
  }, [preload, config.ttl])

  // 缓存API响应
  const cacheApiResponse = useCallback(async function<R = T>(
    url: string,
    fetcher: () => Promise<R>,
    ttl?: number
  ): Promise<R> {
    const genericFetcher = fetcher as unknown as () => Promise<T>
    const preloadedData = await preload(genericFetcher, `api_${url}`, ttl)
    return preloadedData as R
  }, [preload])

  return {
    get,
    set,
    remove,
    clear,
    has,
    size,
    keys,
    getStats,
    preload,
    cacheImage,
    cacheApiResponse,
    cache,
    stats
  }
}

// 全局缓存管理器
export class GlobalCacheManager {
  private static instance: GlobalCacheManager
  private caches: Map<string, any> = new Map()

  static getInstance(): GlobalCacheManager {
    if (!GlobalCacheManager.instance) {
      GlobalCacheManager.instance = new GlobalCacheManager()
    }
    return GlobalCacheManager.instance
  }

  createCache<T>(key: string, options?: CacheOptions) {
    if (!this.caches.has(key)) {
      // 这里应该返回一个新的缓存实例，但为了简单起见，我们只记录
      console.log(`📦 创建全局缓存: ${key}`, options)
    }
    return this.caches.get(key)
  }

  clearAllCaches() {
    this.caches.clear()
    console.log('🧹 清除所有全局缓存')
  }

  getCacheStats() {
    return {
      totalCaches: this.caches.size,
      cacheKeys: Array.from(this.caches.keys())
    }
  }
}

export const globalCacheManager = GlobalCacheManager.getInstance()