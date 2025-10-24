import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export interface AdminUser {
  user_id: string
  email: string
  role: 'admin' | 'super_admin'
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface UseAdminReturn {
  isAdmin: boolean
  isSuperAdmin: boolean
  adminData: AdminUser | null
  loading: boolean
  error: string | null
  hasPermission: (permission: string) => boolean
  checkPermission: (requiredLevel: 'admin' | 'super_admin') => boolean
}

export function useAdmin(): UseAdminReturn {
  const { user } = useAuth()
  const [adminData, setAdminData] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAdminStatus() {
      if (!user) {
        setAdminData(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // 调用管理员验证 Edge Function
        const { data, error: functionError } = await supabase.functions.invoke('verify-admin', {
          body: { user_id: user.id }
        })

        if (functionError) {
          console.error('验证管理员状态失败:', functionError)
          setError('验证管理员权限失败')
          setAdminData(null)
          return
        }

        if (data?.success && data?.admin) {
          setAdminData(data.admin)
        } else {
          setAdminData(null)
        }
      } catch (err: any) {
        console.error('检查管理员权限失败:', err)
        setError('检查管理员权限失败: ' + err.message)
        setAdminData(null)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user])

  // 检查是否为管理员（包含超级管理员）
  const isAdmin = !!adminData

  // 检查是否为超级管理员
  const isSuperAdmin = adminData?.role === 'super_admin'

  // 检查特定权限
  const hasPermission = (permission: string): boolean => {
    if (!adminData) return false
    return adminData.permissions.includes(permission)
  }

  // 检查管理员级别
  const checkPermission = (requiredLevel: 'admin' | 'super_admin'): boolean => {
    if (!adminData) return false
    
    if (requiredLevel === 'admin') {
      return isAdmin
    } else if (requiredLevel === 'super_admin') {
      return isSuperAdmin
    }
    
    return false
  }

  return {
    isAdmin,
    isSuperAdmin,
    adminData,
    loading,
    error,
    hasPermission,
    checkPermission
  }
}