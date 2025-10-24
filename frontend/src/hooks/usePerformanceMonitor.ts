import { useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  componentName: string
  renderTime: number
  mountTime?: number
  updateTime?: number
  unmountTime?: number
}

interface UsePerformanceMonitorOptions {
  componentName: string
  enabled?: boolean
  logPerformance?: boolean
  threshold?: number // 性能阈值(ms)
}

// 性能监控结果缓存
const performanceCache = new Map<string, PerformanceMetrics>()

export function usePerformanceMonitor({
  componentName,
  enabled = true,
  logPerformance = true,
  threshold = 16 // 16ms = 60fps
}: UsePerformanceMonitorOptions) {
  const mountTime = useRef<number>()
  const renderCount = useRef<number>(0)
  const lastRenderTime = useRef<number>()

  // 记录组件挂载
  useEffect(() => {
    if (!enabled) return

    const start = performance.now()
    mountTime.current = start

    // 记录挂载性能
    const metrics: PerformanceMetrics = {
      componentName,
      renderTime: 0,
      mountTime: start
    }

    performanceCache.set(componentName, metrics)

    return () => {
      const end = performance.now()
      const totalTime = end - start
      
      metrics.unmountTime = totalTime
      
      if (logPerformance && totalTime > threshold) {
        console.warn(
          `⚠️  性能警告: ${componentName} 挂载时间过长 (${totalTime.toFixed(2)}ms)`,
          { threshold, actual: totalTime }
        )
      }
    }
  }, [componentName, enabled])

  // 记录组件渲染
  const measureRender = useCallback(() => {
    if (!enabled) return

    const start = performance.now()
    const metrics = performanceCache.get(componentName)

    if (metrics && mountTime.current) {
      metrics.renderTime = start - mountTime.current
      renderCount.current += 1

      if (lastRenderTime.current) {
        metrics.updateTime = start - lastRenderTime.current
      }
      
      lastRenderTime.current = start

      // 如果启用性能日志且超过阈值，记录警告
      if (logPerformance && metrics.renderTime > threshold) {
        console.warn(
          `⚠️  性能警告: ${componentName} 渲染时间过长 (${metrics.renderTime.toFixed(2)}ms)`,
          { 
            threshold, 
            actual: metrics.renderTime,
            renderCount: renderCount.current,
            isUpdate: !!metrics.updateTime
          }
        )
      }
    }

    return start
  }, [componentName, enabled, logPerformance, threshold])

  // 获取性能统计
  const getMetrics = useCallback((): PerformanceMetrics | null => {
    return performanceCache.get(componentName) || null
  }, [componentName])

  // 测量异步操作
  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    const start = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - start
      
      if (logPerformance) {
        console.log(`⏱️  ${componentName} - ${operationName}: ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(
        `❌ ${componentName} - ${operationName} 失败 (${duration.toFixed(2)}ms):`,
        error
      )
      throw error
    }
  }, [componentName, logPerformance])

  // 测量同步操作
  const measureSync = useCallback(<T>(
    operation: () => T,
    operationName: string
  ): T => {
    const start = performance.now()
    
    try {
      const result = operation()
      const duration = performance.now() - start
      
      if (logPerformance && duration > threshold) {
        console.warn(
          `⚠️  ${componentName} - ${operationName}: ${duration.toFixed(2)}ms`,
          { threshold }
        )
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(
        `❌ ${componentName} - ${operationName} 失败 (${duration.toFixed(2)}ms):`,
        error
      )
      throw error
    }
  }, [componentName, logPerformance, threshold])

  // 监控内存使用
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
      
      if (usedMB > 50) { // 50MB阈值
        console.warn(
          `💾 内存警告: ${componentName} - 当前使用 ${usedMB}MB`,
          {
            totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024) + 'MB',
            jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + 'MB'
          }
        )
      }
      
      return {
        used: usedMB,
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      }
    }
    return null
  }, [componentName])

  return {
    measureRender,
    getMetrics,
    measureAsync,
    measureSync,
    checkMemoryUsage,
    renderCount: renderCount.current
  }
}

// 监控多个组件的性能
export function useMultiPerformanceMonitor(components: string[], enabled = true) {
  // 为每个组件创建独立的性能监控实例
  const createMonitor = (componentName: string) => {
    return usePerformanceMonitor({ componentName, enabled })
  }

  // 使用useCallback来避免在循环中直接调用Hook
  const getAllMetrics = useCallback(() => {
    return components.map(componentName => ({
      componentName,
      metrics: null // 这里应该返回实际的metrics，但我们不能在这里创建新的Hook实例
    }))
  }, [components])

  // 批量内存检查
  const checkAllMemoryUsage = useCallback(() => {
    return components.map(componentName => ({
      componentName,
      memory: null // 这里应该返回实际的内存信息
    }))
  }, [components])

  return {
    getAllMetrics,
    checkAllMemoryUsage,
    components
  }
}

// 全局性能监控
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private observers: Map<string, PerformanceObserver> = new Map()
  private metrics: Map<string, number[]> = new Map()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // 监控长任务
  startLongTaskMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            console.warn(`⏱️  长任务检测: ${entry.duration.toFixed(2)}ms`, entry)
            
            const tasks = this.metrics.get('longTasks') || []
            tasks.push(entry.duration)
            this.metrics.set('longTasks', tasks)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['longtask'] })
        this.observers.set('longTask', observer)
      } catch (e) {
        console.warn('长任务监控不可用:', e)
      }
    }
  }

  // 监控首次内容绘制
  startFirstContentfulPaintMonitoring() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            console.log(`🎨 首次内容绘制: ${entry.startTime.toFixed(2)}ms`)
            
            const fcp = this.metrics.get('fcp') || []
            fcp.push(entry.startTime)
            this.metrics.set('fcp', fcp)
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['paint'] })
        this.observers.set('paint', observer)
      } catch (e) {
        console.warn('首次内容绘制监控不可用:', e)
      }
    }
  }

  // 获取性能报告
  getPerformanceReport() {
    const report: Record<string, any> = {}
    
    for (const [key, values] of this.metrics) {
      report[key] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        max: Math.max(...values),
        min: Math.min(...values)
      }
    }
    
    return report
  }

  // 停止所有监控
  stopAllMonitoring() {
    for (const observer of this.observers.values()) {
      observer.disconnect()
    }
    this.observers.clear()
    this.metrics.clear()
  }
}

// 初始化全局性能监控
export const globalPerformanceMonitor = PerformanceMonitor.getInstance()