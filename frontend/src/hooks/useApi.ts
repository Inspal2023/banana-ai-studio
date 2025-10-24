import { useState, useCallback, useRef, useEffect } from 'react'
import { useCache } from './useCache'

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  retryDelay?: number
  cache?: boolean
  cacheKey?: string
  cacheTtl?: number
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  success: boolean
}

interface UseApiReturn<T> extends ApiState<T> {
  request: (url: string, config?: RequestConfig) => Promise<T>
  refetch: () => Promise<T | null>
  reset: () => void
  cancel: () => void
  abortController: AbortController | null
}

// 请求队列管理
class RequestQueue {
  private static instance: RequestQueue
  private queue: Map<string, Promise<any>> = new Map()
  private activeRequests: Set<string> = new Set()

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue()
    }
    return RequestQueue.instance
  }

  // 添加请求到队列
  async enqueue<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 如果请求已在进行中，返回现有promise
    if (this.activeRequests.has(key)) {
      return this.queue.get(key)!
    }

    const promise = requestFn().finally(() => {
      this.queue.delete(key)
      this.activeRequests.delete(key)
    })

    this.queue.set(key, promise)
    this.activeRequests.add(key)

    return promise
  }

  // 取消请求
  cancel(key: string) {
    if (this.queue.has(key)) {
      this.queue.delete(key)
      this.activeRequests.delete(key)
    }
  }

  // 取消所有请求
  cancelAll() {
    this.queue.clear()
    this.activeRequests.clear()
  }
}

// 请求去重管理器
class RequestDeduplicator {
  private static instance: RequestDeduplicator
  private pendingRequests: Map<string, Promise<any>> = new Map()

  static getInstance(): RequestDeduplicator {
    if (!RequestDeduplicator.instance) {
      RequestDeduplicator.instance = new RequestDeduplicator()
    }
    return RequestDeduplicator.instance
  }

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key)
    })

    this.pendingRequests.set(key, promise)
    return promise
  }
}

const requestQueue = RequestQueue.getInstance()
const deduplicator = RequestDeduplicator.getInstance()

// 默认配置
const DEFAULT_CONFIG: Omit<Required<RequestConfig>, 'body'> & { body?: any } = {
  method: 'GET',
  headers: {},
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: false,
  cacheKey: '',
  cacheTtl: 5 * 60 * 1000, // 5分钟
  body: undefined
}

export function useApi<T = any>(initialUrl?: string, initialConfig?: RequestConfig) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentRequestRef = useRef<{ url: string; config: RequestConfig } | null>(null)

  // 缓存Hook
  const { get: getCache, set: setCache } = useCache<any>('api-cache', {
    maxSize: 50,
    ttl: 5 * 60 * 1000
  })

  // 延迟函数
  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 重试逻辑
  const retryRequest = async <R>(
    requestFn: () => Promise<R>,
    retries: number,
    retryDelay: number
  ): Promise<R> => {
    try {
      return await requestFn()
    } catch (error) {
      if (retries > 0) {
        await delay(retryDelay)
        return retryRequest(requestFn, retries - 1, retryDelay)
      }
      throw error
    }
  }

  // 实际请求函数
  const executeRequest = async (url: string, config: RequestConfig): Promise<T> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config }
    const { timeout, retries, retryDelay } = finalConfig
    
    // 创建AbortController
    const controller = new AbortController()
    abortControllerRef.current = controller

    const requestFn = async (): Promise<T> => {
      // 检查缓存
      if (finalConfig.cache && finalConfig.cacheKey) {
        const cached = getCache(finalConfig.cacheKey)
        if (cached) {
          console.log(`📦 缓存命中: ${finalConfig.cacheKey}`)
          return cached
        }
      }

      // 构建请求配置
      const fetchConfig: RequestInit = {
        method: finalConfig.method,
        headers: {
          'Content-Type': 'application/json',
          ...finalConfig.headers
        },
        signal: controller.signal
      }

      if (finalConfig.body && finalConfig.method !== 'GET') {
        fetchConfig.body = typeof finalConfig.body === 'string' 
          ? finalConfig.body 
          : JSON.stringify(finalConfig.body)
      }

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), timeout)
      })

      try {
        console.log(`🌐 API请求: ${finalConfig.method} ${url}`)
        const startTime = performance.now()

        const response = await Promise.race([
          fetch(url, fetchConfig),
          timeoutPromise
        ])

        const duration = performance.now() - startTime
        console.log(`✅ API响应: ${finalConfig.method} ${url} (${duration.toFixed(2)}ms)`)

        if (!response.ok) {
          throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type')
        let data: T

        if (contentType?.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text() as any
        }

        // 缓存响应
        if (finalConfig.cache && finalConfig.cacheKey) {
          setCache(data, finalConfig.cacheKey, finalConfig.cacheTtl)
        }

        return data
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('请求已取消')
        }
        throw error
      }
    }

    // 执行重试逻辑
    return retryRequest(requestFn, retries, retryDelay)
  }

  // 执行请求
  const request = useCallback(async (url: string, config: RequestConfig = {}): Promise<T> => {
    const finalConfig = { ...initialConfig, ...config }
    
    setState(prev => ({ ...prev, loading: true, error: null }))
    currentRequestRef.current = { url, config: finalConfig }

    try {
      // 请求去重
      const requestKey = `${finalConfig.method}-${url}-${JSON.stringify(finalConfig.body || '')}`
      
      const data = await requestQueue.enqueue(requestKey, async () => {
        return deduplicator.deduplicate(requestKey, async () => {
          return executeRequest(url, finalConfig)
        })
      })

      setState({
        data,
        loading: false,
        error: null,
        success: true
      })

      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '请求失败'
      console.error(`❌ API请求失败: ${url}`, error)
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error(errorMessage),
        success: false
      }))

      throw error
    }
  }, [initialConfig, getCache, setCache, executeRequest])

  // 重新请求
  const refetch = useCallback(async (): Promise<T | null> => {
    if (currentRequestRef.current) {
      const { url, config } = currentRequestRef.current
      return request(url, config)
    }
    return null
  }, [request])

  // 重置状态
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
    currentRequestRef.current = null
  }, [])

  // 取消请求
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    requestQueue.cancelAll()
    
    setState(prev => ({
      ...prev,
      loading: false
    }))
  }, [])

  // 自动请求（如果提供了初始URL）
  useEffect(() => {
    if (initialUrl) {
      request(initialUrl, initialConfig)
    }
  }, [initialUrl, initialConfig, request])

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      cancel()
    }
  }, [cancel])

  return {
    ...state,
    request,
    refetch,
    reset,
    cancel,
    abortController: abortControllerRef.current
  }
}

// 预定义的API hooks
export function useGetApi<T>(url: string, config?: RequestConfig) {
  return useApi<T>(url, { ...config, method: 'GET' })
}

export function usePostApi<T>(url: string, config?: Omit<RequestConfig, 'method'>) {
  return useApi<T>(url, { ...config, method: 'POST' })
}

export function usePutApi<T>(url: string, config?: Omit<RequestConfig, 'method'>) {
  return useApi<T>(url, { ...config, method: 'PUT' })
}

export function useDeleteApi<T>(url: string, config?: Omit<RequestConfig, 'method'>) {
  return useApi<T>(url, { ...config, method: 'DELETE' })
}

// 批量请求Hook
export function useBatchApi() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Error[]>([])

  // 批量请求函数，不在Hook内部创建子Hook
  const batchRequest = useCallback(async <T>(
    requests: Array<{ url: string; config?: RequestConfig }>
  ): Promise<T[]> => {
    setLoading(true)
    setErrors([])

    try {
      // 使用fetch直接执行请求，避免在Hook中创建子Hook
      const results = await Promise.allSettled(
        requests.map(async ({ url, config }) => {
          const finalConfig = { ...config }
          const controller = new AbortController()
          
          const fetchConfig: RequestInit = {
            method: finalConfig.method || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...finalConfig.headers
            },
            signal: controller.signal
          }

          if (finalConfig.body && finalConfig.method !== 'GET') {
            fetchConfig.body = typeof finalConfig.body === 'string' 
              ? finalConfig.body 
              : JSON.stringify(finalConfig.body)
          }

          const response = await fetch(url, fetchConfig)
          
          if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`)
          }

          const contentType = response.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            return await response.json()
          } else {
            return await response.text() as any
          }
        })
      )

      const successfulResults: T[] = []
      const newErrors: Error[] = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value)
        } else {
          newErrors.push(new Error(`请求 ${index + 1} 失败: ${result.reason}`))
        }
      })

      if (newErrors.length > 0) {
        setErrors(newErrors)
      }

      return successfulResults
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    batchRequest,
    loading,
    errors
  }
}

// 文件上传Hook
export function useFileUpload() {
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const uploadFile = useCallback(async (
    file: File,
    url: string,
    additionalData?: Record<string, string>
  ): Promise<any> => {
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value)
      })
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // 进度监听
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          setProgress(Math.round(percentComplete))
        }
      })

      xhr.addEventListener('load', () => {
        setUploading(false)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response)
          } catch {
            resolve(xhr.responseText)
          }
        } else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        setUploading(false)
        reject(new Error('上传失败'))
      })

      xhr.open('POST', url)
      xhr.send(formData)
    })
  }, [])

  return {
    uploadFile,
    progress,
    uploading
  }
}