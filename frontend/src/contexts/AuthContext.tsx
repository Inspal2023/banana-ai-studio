import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 缓存用户数据的内存缓存
const userCache = new Map<string, { user: User | null; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const authStateRef = useRef<{
    lastActivity: number
    initialized: boolean
  }>({
    lastActivity: Date.now(),
    initialized: false
  })

  // 性能监控
  const measureAuthPerformance = useCallback((operation: string) => {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      console.log(`🔐 Auth操作: ${operation} - ${duration.toFixed(2)}ms`)
    }
  }, [])

  // 检查缓存有效性
  const getCachedUser = useCallback((userId: string): User | null => {
    const cached = userCache.get(userId)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.user
    }
    return null
  }, [])

  // 缓存用户数据
  const cacheUser = useCallback((user: User | null) => {
    if (user) {
      userCache.set(user.id, {
        user,
        timestamp: Date.now()
      })
    } else {
      userCache.clear()
    }
  }, [])

  // 刷新用户数据
  const refreshUser = useCallback(async () => {
    const endMeasure = measureAuthPerformance('refreshUser')
    try {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error) throw error
      
      setUser(currentUser)
      cacheUser(currentUser)
    } catch (error) {
      console.error('刷新用户信息失败:', error)
    } finally {
      endMeasure()
    }
  }, [measureAuthPerformance, cacheUser])

  useEffect(() => {
    let mounted = true

    // 初始化：检查当前会话
    async function initializeAuth() {
      const endMeasure = measureAuthPerformance('initializeAuth')
      setLoading(true)
      
      try {
        // 获取当前会话
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          
          // 缓存用户信息
          if (currentSession?.user) {
            cacheUser(currentSession.user)
          }
          
          authStateRef.current.initialized = true
          authStateRef.current.lastActivity = Date.now()
          
          // 如果有session且在登录页，跳转到主页
          if (currentSession?.user && window.location.pathname === '/auth') {
            navigate('/', { replace: true })
          }
        }
      } catch (error) {
        console.error('初始化认证失败:', error)
        if (mounted) {
          setUser(null)
          setSession(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
        endMeasure()
      }
    }

    initializeAuth()

    // 监听认证状态变化 - 优化版本，避免频繁状态更新
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        const endMeasure = measureAuthPerformance(`onAuthStateChange-${event}`)
        
        try {
          setSession(session)
          setUser(session?.user ?? null)
          
          // 缓存用户信息
          if (session?.user) {
            cacheUser(session.user)
          } else {
            userCache.clear()
          }
          
          authStateRef.current.lastActivity = Date.now()
          
          // 智能路由：根据认证状态决定导航
          if (authStateRef.current.initialized) {
            if (session?.user && window.location.pathname === '/auth') {
              navigate('/', { replace: true })
            } else if (!session?.user && window.location.pathname !== '/auth') {
              navigate('/auth', { replace: true })
            }
          }
        } catch (error) {
          console.error('认证状态变更处理失败:', error)
        } finally {
          endMeasure()
        }
      }
    )

    // 清理函数
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate, measureAuthPerformance, cacheUser])

  // 登录函数
  const signIn = useCallback(async (email: string, password: string) => {
    const endMeasure = measureAuthPerformance('signIn')
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      })
      if (error) throw error
      
      // 登录成功后的逻辑由onAuthStateChange处理
    } finally {
      endMeasure()
    }
  }, [measureAuthPerformance])

  // 登出函数
  const signOut = useCallback(async () => {
    const endMeasure = measureAuthPerformance('signOut')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // 清理缓存
      userCache.clear()
      
      // 登出成功后的逻辑由onAuthStateChange处理
    } finally {
      endMeasure()
    }
  }, [measureAuthPerformance])

  // 监听页面活动状态，减少不必要的重渲染
  useEffect(() => {
    const handleActivity = () => {
      authStateRef.current.lastActivity = Date.now()
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleActivity()
        // 页面重新激活时，刷新用户状态
        const timeSinceLastActivity = Date.now() - authStateRef.current.lastActivity
        if (timeSinceLastActivity > 30000) { // 30秒后重新检查
          refreshUser()
        }
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleActivity)
    }
  }, [refreshUser])

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signOut,
    refreshUser,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
