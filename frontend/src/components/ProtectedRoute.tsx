import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { FullScreenLoading } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  // 性能监控：记录ProtectedRoute渲染时间
  React.useEffect(() => {
    performance.mark('component-protected-route-start')
    return () => {
      performance.mark('component-protected-route-end')
      performance.measure('component-protected-route', 'component-protected-route-start', 'component-protected-route-end')
    }
  }, [])

  if (loading) {
    return <FullScreenLoading message="正在验证用户身份..." />
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  // 如果需要管理员权限但用户不是管理员，可以添加额外检查
  if (requireAdmin) {
    // 这里可以添加管理员权限检查逻辑
    // 例如检查用户角色或特定字段
  }

  return <>{children}</>
}
