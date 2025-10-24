import { useState, useEffect } from 'react'
import { ArrowLeft, Shield, User, Crown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAdmin } from '../hooks/useAdmin'
import { supabase } from '../lib/supabase'
import AdminPointsManagement from '../components/AdminPointsManagement'
import AdminStats from '../components/AdminStats'
import RechargeManagement from '../components/RechargeManagement'
import AdminAccessDenied from '../components/AdminAccessDenied'

interface UserData {
  user_id: string
  email: string
  current_points: number
  total_points: number
  total_spent: number
  last_activity: string
  created_at: string
  updated_at: string
}

interface TransactionData {
  id: string
  user_id: string
  user_email: string
  type: 'earn' | 'spend' | 'recharge' | 'admin_add' | 'admin_deduct'
  amount: number
  description: string
  created_at: string
  status: 'completed' | 'pending' | 'failed'
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin, isSuperAdmin, adminData, loading: adminLoading, error: adminError } = useAdmin()
  
  const [activeTab, setActiveTab] = useState<'points' | 'stats' | 'recharge'>('points')
  const [users, setUsers] = useState<UserData[]>([])
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 权限验证加载中
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl font-bold text-neutral-700">验证管理员权限...</p>
          <p className="text-sm text-neutral-500 mt-2">请稍候</p>
        </div>
      </div>
    )
  }

  // 非管理员用户重定向到错误页面
  if (!isAdmin || adminError) {
    return (
      <AdminAccessDenied
        title="非管理员访问"
        message={adminError || "您需要管理员权限才能访问此页面"}
      />
    )
  }

  // 获取用户数据
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .order('email')
      
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('获取用户数据失败:', err)
      setError('获取用户数据失败: ' + err.message)
    }
  }

  // 获取交易记录
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      setTransactions(data || [])
    } catch (err: any) {
      console.error('获取交易记录失败:', err)
      setError('获取交易记录失败: ' + err.message)
    }
  }

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchUsers(), fetchTransactions()])
      setLoading(false)
    }
    loadData()
  }, [])

  // 添加积分
  const handleAddPoints = async (userId: string, amount: number, reason: string) => {
    try {
      // 添加交易记录
      const { error: transactionError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'admin_add',
          amount: amount,
          description: reason,
          status: 'completed'
        })
      
      if (transactionError) throw transactionError
      
      // 更新用户积分
      const { error: updateError } = await supabase.rpc('add_user_points', {
        user_id_param: userId,
        points_to_add: amount
      })
      
      if (updateError) throw updateError
      
      // 刷新数据
      await Promise.all([fetchUsers(), fetchTransactions()])
      
      alert('积分添加成功')
    } catch (err: any) {
      console.error('添加积分失败:', err)
      alert('添加积分失败: ' + err.message)
    }
  }

  // 扣除积分
  const handleDeductPoints = async (userId: string, amount: number, reason: string) => {
    try {
      // 检查用户积分是否充足
      const user = users.find(u => u.user_id === userId)
      if (!user || user.current_points < amount) {
        alert('用户积分不足，无法扣除')
        return
      }
      
      // 添加交易记录
      const { error: transactionError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: userId,
          type: 'admin_deduct',
          amount: -amount,
          description: reason,
          status: 'completed'
        })
      
      if (transactionError) throw transactionError
      
      // 更新用户积分
      const { error: updateError } = await supabase.rpc('deduct_user_points', {
        user_id_param: userId,
        points_to_deduct: amount
      })
      
      if (updateError) throw updateError
      
      // 刷新数据
      await Promise.all([fetchUsers(), fetchTransactions()])
      
      alert('积分扣除成功')
    } catch (err: any) {
      console.error('扣除积分失败:', err)
      alert('扣除积分失败: ' + err.message)
    }
  }

  // 更新用户积分（直接设置）
  const handleUpdateUserPoints = async (userId: string, newPoints: number) => {
    try {
      const user = users.find(u => u.user_id === userId)
      if (!user) return
      
      const difference = newPoints - user.current_points
      
      if (difference > 0) {
        await handleAddPoints(userId, difference, '管理员直接设置积分')
      } else if (difference < 0) {
        await handleDeductPoints(userId, Math.abs(difference), '管理员直接设置积分')
      }
    } catch (err: any) {
      console.error('更新用户积分失败:', err)
      alert('更新用户积分失败: ' + err.message)
    }
  }

  // 批量操作用户
  const handleBatchOperation = async (userIds: string[], operation: 'add' | 'deduct', amount: number, reason: string) => {
    try {
      for (const userId of userIds) {
        if (operation === 'add') {
          await handleAddPoints(userId, amount, reason)
        } else {
          await handleDeductPoints(userId, amount, reason)
        }
      }
      alert(`批量${operation === 'add' ? '添加' : '扣除'}积分成功`)
    } catch (err: any) {
      console.error('批量操作失败:', err)
      alert('批量操作失败: ' + err.message)
    }
  }

  // 导出用户数据
  const exportUsersData = () => {
    const exportData = users.map(user => ({
      '用户邮箱': user.email,
      '当前积分': user.current_points,
      '总获得积分': user.total_points,
      '总消费积分': user.total_spent,
      '注册时间': new Date(user.created_at).toLocaleString('zh-CN'),
      '最后活动': user.last_activity ? new Date(user.last_activity).toLocaleString('zh-CN') : '未知'
    }))
    
    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `users-data-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 转换数据格式以适配组件
  const adaptedUsers = users.map(user => ({
    id: user.user_id,
    email: user.email,
    currentPoints: user.current_points,
    totalPoints: user.total_points,
    totalSpent: user.total_spent,
    lastActivity: new Date(user.last_activity || user.updated_at),
    registrationDate: new Date(user.created_at)
  }))

  const adaptedTransactions = transactions.map(transaction => ({
    id: transaction.id,
    userId: transaction.user_id,
    userEmail: transaction.user_email,
    type: transaction.type,
    amount: transaction.amount,
    description: transaction.description,
    timestamp: new Date(transaction.created_at),
    status: transaction.status
  }))

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* 管理员头部 */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                返回主页
              </button>
              <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                管理员后台
                {isSuperAdmin ? (
                  <Crown className="w-6 h-6 text-yellow-500" />
                ) : (
                  <Shield className="w-6 h-6 text-blue-500" />
                )}
              </h1>
            </div>
            <div className="text-sm text-neutral-500">
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  {isSuperAdmin ? (
                    <>
                      <Crown className="w-4 h-4 text-yellow-500" />
                      <span className="font-medium text-yellow-600">超级管理员</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-blue-600">管理员</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-400">当前用户：{user?.email}</p>
                <p className="text-xs text-neutral-400">登录时间：{new Date().toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 管理员内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
              <span className="text-neutral-600">加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800">
              <span className="font-medium">加载失败</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : (
          <>
            {/* Tab 导航 */}
            <div className="border-b border-neutral-200 mb-6">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('points')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'points'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  积分管理
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'stats'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  数据统计
                </button>
                <button
                  onClick={() => setActiveTab('recharge')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'recharge'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  充值管理
                </button>
              </nav>
            </div>

            {/* Tab 内容 */}
            {activeTab === 'points' && (
              <AdminPointsManagement
                users={adaptedUsers}
                transactions={adaptedTransactions}
                onAddPoints={handleAddPoints}
                onDeductPoints={handleDeductPoints}
                onUpdateUserPoints={handleUpdateUserPoints}
                onBatchOperation={handleBatchOperation}
                onExportData={exportUsersData}
              />
            )}

            {activeTab === 'stats' && (
              <AdminStats />
            )}

            {activeTab === 'recharge' && (
              <RechargeManagement />
            )}
          </>
        )}
      </main>
    </div>
  )
}