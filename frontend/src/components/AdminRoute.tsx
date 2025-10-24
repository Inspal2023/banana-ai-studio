import { Navigate, useLocation } from 'react-router-dom'
import { useAdmin } from '../hooks/useAdmin'

interface AdminRouteProps {
  children: React.ReactNode
  requiredLevel?: 'admin' | 'super_admin'
  fallbackPath?: string
}

export default function AdminRoute({ 
  children, 
  requiredLevel = 'admin',
  fallbackPath = '/' 
}: AdminRouteProps) {
  const { isAdmin, isSuperAdmin, loading, error, adminData } = useAdmin()
  const location = useLocation()

  // 加载中状态
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-red-600 mb-4"></div>
          <p className="text-xl font-bold text-neutral-700">验证管理员权限...</p>
          <p className="text-sm text-neutral-500 mt-2">请稍候</p>
        </div>
      </div>
    )
  }

  // 验证失败或错误
  if (error || !adminData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">访问被拒绝</h2>
          <p className="text-gray-600 mb-6">
            {error || '您没有权限访问此页面'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回上一页
            </button>
            <button
              onClick={() => window.location.href = fallbackPath}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 检查管理员级别权限
  const hasRequiredPermission = (() => {
    if (requiredLevel === 'admin') {
      return isAdmin
    } else if (requiredLevel === 'super_admin') {
      return isSuperAdmin
    }
    return false
  })()

  if (!hasRequiredPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">权限不足</h2>
          <p className="text-gray-600 mb-2">
            您需要 <strong>{requiredLevel === 'super_admin' ? '超级管理员' : '管理员'}</strong> 权限才能访问此页面。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            当前权限级别：<span className="font-medium">{adminData?.role === 'super_admin' ? '管理员' : '普通用户'}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回上一页
            </button>
            <button
              onClick={() => window.location.href = fallbackPath}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回主页
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 权限验证通过，渲染子组件
  return <>{children}</>
}