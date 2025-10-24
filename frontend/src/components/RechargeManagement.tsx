import { useState, useEffect } from 'react'
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Eye,
  Trash2,
  Plus
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface RechargeRecord {
  id: string
  user_id: string
  user_email: string
  amount: number
  payment_method: string
  payment_screenshot?: string
  description?: string
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  admin_notes?: string
  processed_by?: string
  processed_at?: string
  created_at: string
  updated_at: string
}

interface RechargeFormData {
  user_id: string
  amount: number
  payment_method: string
  description: string
}

export default function RechargeManagement() {
  const [recharges, setRecharges] = useState<RechargeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  })

  // 添加充值表单状态
  const [showAddForm, setShowAddForm] = useState(false)
  const [addFormData, setAddFormData] = useState<RechargeFormData>({
    user_id: '',
    amount: 0,
    payment_method: '微信',
    description: ''
  })
  const [users, setUsers] = useState<any[]>([])

  // 详细查看模态框
  const [selectedRecharge, setSelectedRecharge] = useState<RechargeRecord | null>(null)

  // 获取用户列表（用于添加充值）
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('user_id, email')
        .order('email')
      
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error('获取用户列表失败:', err)
    }
  }

  // 获取充值记录
  const fetchRecharges = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let query = supabase
        .from('recharge_records')
        .select('*')
        .order('created_at', { ascending: false })
      
      // 应用搜索过滤
      if (searchTerm) {
        query = query.or(`user_email.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }
      
      // 应用状态过滤
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }
      
      // 应用支付方式过滤
      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter)
      }
      
      // 应用日期过滤
      if (dateRange.start) {
        query = query.gte('created_at', `${dateRange.start}T00:00:00`)
      }
      if (dateRange.end) {
        query = query.lte('created_at', `${dateRange.end}T23:59:59`)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      setRecharges(data || [])
    } catch (err: any) {
      console.error('获取充值记录失败:', err)
      setError(err.message || '获取充值记录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchRecharges()
  }, [searchTerm, statusFilter, methodFilter, dateRange])

  // 处理充值状态更新
  const handleStatusUpdate = async (rechargeId: string, newStatus: string, adminNotes?: string) => {
    try {
      const { error } = await supabase
        .from('recharge_records')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rechargeId)
      
      if (error) throw error
      
      // 如果状态更新为完成，自动给用户增加积分
      if (newStatus === 'completed') {
        const recharge = recharges.find(r => r.id === rechargeId)
        if (recharge) {
          // 添加积分交易记录
          await supabase
            .from('point_transactions')
            .insert({
              user_id: recharge.user_id,
              type: 'recharge',
              amount: recharge.amount,
              description: `充值奖励 - ${recharge.description || '系统充值'}`,
              status: 'completed'
            })
          
          // 更新用户积分
          await supabase.rpc('add_user_points', {
            user_id_param: recharge.user_id,
            points_to_add: recharge.amount
          })
        }
      }
      
      await fetchRecharges()
      alert('状态更新成功')
    } catch (err: any) {
      console.error('更新状态失败:', err)
      alert('更新状态失败: ' + err.message)
    }
  }

  // 添加充值记录
  const handleAddRecharge = async () => {
    try {
      if (!addFormData.user_id || !addFormData.amount || addFormData.amount <= 0) {
        alert('请填写完整的充值信息')
        return
      }
      
      const user = users.find(u => u.user_id === addFormData.user_id)
      if (!user) {
        alert('找不到指定用户')
        return
      }
      
      const { error } = await supabase
        .from('recharge_records')
        .insert({
          user_id: addFormData.user_id,
          user_email: user.email,
          amount: addFormData.amount,
          payment_method: addFormData.payment_method,
          description: addFormData.description,
          status: 'completed' // 手动添加的直接标记为完成
        })
      
      if (error) throw error
      
      // 自动添加积分
      await supabase
        .from('point_transactions')
        .insert({
          user_id: addFormData.user_id,
          type: 'recharge',
          amount: addFormData.amount,
          description: `手动充值 - ${addFormData.description}`,
          status: 'completed'
        })
      
      // 更新用户积分
      await supabase.rpc('add_user_points', {
        user_id_param: addFormData.user_id,
        points_to_add: addFormData.amount
      })
      
      setShowAddForm(false)
      setAddFormData({
        user_id: '',
        amount: 0,
        payment_method: '微信',
        description: ''
      })
      await fetchRecharges()
      alert('充值记录添加成功')
    } catch (err: any) {
      console.error('添加充值记录失败:', err)
      alert('添加失败: ' + err.message)
    }
  }

  // 删除充值记录
  const handleDelete = async (rechargeId: string) => {
    if (!confirm('确定要删除这条充值记录吗？此操作不可恢复。')) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('recharge_records')
        .delete()
        .eq('id', rechargeId)
      
      if (error) throw error
      await fetchRecharges()
      alert('删除成功')
    } catch (err: any) {
      console.error('删除失败:', err)
      alert('删除失败: ' + err.message)
    }
  }

  // 导出数据
  const exportData = () => {
    const exportData = recharges.map(recharge => ({
      '充值ID': recharge.id,
      '用户邮箱': recharge.user_email,
      '充值金额': recharge.amount,
      '支付方式': recharge.payment_method,
      '状态': recharge.status === 'completed' ? '已完成' : 
             recharge.status === 'pending' ? '待处理' :
             recharge.status === 'failed' ? '失败' : '已取消',
      '描述': recharge.description || '',
      '管理员备注': recharge.admin_notes || '',
      '创建时间': new Date(recharge.created_at).toLocaleString('zh-CN'),
      '处理时间': recharge.processed_at ? new Date(recharge.processed_at).toLocaleString('zh-CN') : ''
    }))
    
    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `recharge-records-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // 获取状态显示信息
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          text: '已完成', 
          color: 'bg-green-100 text-green-800', 
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'pending':
        return { 
          text: '待处理', 
          color: 'bg-yellow-100 text-yellow-800', 
          icon: Clock,
          iconColor: 'text-yellow-600'
        }
      case 'failed':
        return { 
          text: '失败', 
          color: 'bg-red-100 text-red-800', 
          icon: XCircle,
          iconColor: 'text-red-600'
        }
      case 'cancelled':
        return { 
          text: '已取消', 
          color: 'bg-gray-100 text-gray-800', 
          icon: XCircle,
          iconColor: 'text-gray-600'
        }
      default:
        return { 
          text: '未知', 
          color: 'bg-gray-100 text-gray-800', 
          icon: AlertCircle,
          iconColor: 'text-gray-600'
        }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-neutral-600">加载充值记录...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">充值管理</h2>
          <p className="text-sm text-neutral-600 mt-1">
            管理用户充值记录，处理充值申请
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加充值
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
          <button
            onClick={fetchRecharges}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总充值金额</p>
              <p className="text-2xl font-bold text-neutral-900">
                ¥{recharges.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">待处理</p>
              <p className="text-2xl font-bold text-neutral-900">
                {recharges.filter(r => r.status === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">已完成</p>
              <p className="text-2xl font-bold text-neutral-900">
                {recharges.filter(r => r.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">失败/取消</p>
              <p className="text-2xl font-bold text-neutral-900">
                {recharges.filter(r => r.status === 'failed' || r.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-white rounded-lg border border-neutral-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
            <input
              type="text"
              placeholder="搜索用户或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">所有状态</option>
            <option value="pending">待处理</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
          
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">所有支付方式</option>
            <option value="微信">微信</option>
            <option value="支付宝">支付宝</option>
            <option value="银行卡">银行卡</option>
            <option value="其他">其他</option>
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="开始日期"
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="结束日期"
          />
        </div>
      </div>

      {/* 充值记录表格 */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  充值金额
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  支付方式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  描述
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {recharges.map((recharge) => {
                const statusInfo = getStatusInfo(recharge.status)
                const StatusIcon = statusInfo.icon
                
                return (
                  <tr key={recharge.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-neutral-400" />
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {recharge.user_email}
                          </div>
                          <div className="text-xs text-neutral-500">
                            ID: {recharge.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">¥{recharge.amount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-neutral-900">{recharge.payment_method}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                        <StatusIcon className={`w-3 h-3 ${statusInfo.iconColor}`} />
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900 max-w-xs truncate">
                        {recharge.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {new Date(recharge.created_at).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRecharge(recharge)}
                          className="text-primary-600 hover:text-primary-900"
                          title="查看详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {recharge.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(recharge.id, 'completed')}
                              className="text-green-600 hover:text-green-900"
                              title="标记为已完成"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(recharge.id, 'failed', '支付失败')}
                              className="text-red-600 hover:text-red-900"
                              title="标记为失败"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => handleDelete(recharge.id)}
                          className="text-red-600 hover:text-red-900"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {recharges.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <CreditCard className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>暂无充值记录</p>
            </div>
          )}
        </div>
      </div>

      {/* 添加充值表单模态框 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">添加充值记录</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  选择用户
                </label>
                <select
                  value={addFormData.user_id}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">请选择用户</option>
                  {users.map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  充值金额
                </label>
                <input
                  type="number"
                  value={addFormData.amount}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="请输入充值金额"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  支付方式
                </label>
                <select
                  value={addFormData.payment_method}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="微信">微信</option>
                  <option value="支付宝">支付宝</option>
                  <option value="银行卡">银行卡</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  描述
                </label>
                <input
                  type="text"
                  value={addFormData.description}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="充值描述（可选）"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddRecharge}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情查看模态框 */}
      {selectedRecharge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900">充值详情</h3>
              <button
                onClick={() => setSelectedRecharge(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">用户邮箱</label>
                  <p className="text-neutral-900">{selectedRecharge.user_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">充值金额</label>
                  <p className="text-green-600 font-semibold text-lg">¥{selectedRecharge.amount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">支付方式</label>
                  <p className="text-neutral-900">{selectedRecharge.payment_method}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">当前状态</label>
                  {(() => {
                    const statusInfo = getStatusInfo(selectedRecharge.status)
                    const StatusIcon = statusInfo.icon
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-semibold rounded-full ${statusInfo.color}`}>
                        <StatusIcon className={`w-4 h-4 ${statusInfo.iconColor}`} />
                        {statusInfo.text}
                      </span>
                    )
                  })()}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-500 mb-1">创建时间</label>
                  <p className="text-neutral-900">{new Date(selectedRecharge.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {selectedRecharge.processed_at && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-1">处理时间</label>
                    <p className="text-neutral-900">{new Date(selectedRecharge.processed_at).toLocaleString('zh-CN')}</p>
                  </div>
                )}
                {selectedRecharge.admin_notes && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-500 mb-1">管理员备注</label>
                    <p className="text-neutral-900">{selectedRecharge.admin_notes}</p>
                  </div>
                )}
              </div>
            </div>
            
            {selectedRecharge.description && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-500 mb-1">描述</label>
                <p className="text-neutral-900 bg-neutral-50 p-3 rounded-lg">{selectedRecharge.description}</p>
              </div>
            )}
            
            {selectedRecharge.payment_screenshot && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-neutral-500 mb-1">支付截图</label>
                <img
                  src={selectedRecharge.payment_screenshot}
                  alt="支付截图"
                  className="max-w-full h-auto rounded-lg border border-neutral-200"
                />
              </div>
            )}
            
            {selectedRecharge.status === 'pending' && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedRecharge.id, 'failed', '管理员手动标记为失败')
                    setSelectedRecharge(null)
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  标记为失败
                </button>
                <button
                  onClick={() => {
                    handleStatusUpdate(selectedRecharge.id, 'completed')
                    setSelectedRecharge(null)
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  确认完成
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}