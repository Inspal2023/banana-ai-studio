import { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import { LoadingSpinner } from './components/LoadingSpinner'

// 使用React.lazy进行代码分割
const AuthPage = React.lazy(() => import('./pages/AuthPage'))
const MainPage = React.lazy(() => import('./pages/MainPage'))
const AdminPage = React.lazy(() => import('./pages/AdminPage'))

// 预加载组件的函数
const preloadComponents = {
  auth: () => import('./pages/AuthPage'),
  main: () => import('./pages/MainPage'),
  admin: () => import('./pages/AdminPage')
}

// 预加载函数（可在需要时调用）
export const preloadRoutes = {
  auth: () => preloadComponents.auth(),
  main: () => preloadComponents.main(),
  admin: () => preloadComponents.admin()
}

function App() {
  return (
    <AuthProvider>
      <Suspense 
        fallback={
          <LoadingSpinner 
            message="正在加载应用..." 
            className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100"
          />
        }
      >
        <Routes>
          <Route 
            path="/auth" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <AuthPage />
              </Suspense>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner />}>
                  <MainPage />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminRoute requiredLevel="admin" fallbackPath="/">
                  <Suspense fallback={<LoadingSpinner />}>
                    <AdminPage />
                  </Suspense>
                </AdminRoute>
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App

// 导入React以支持React.lazy
import React from 'react'

