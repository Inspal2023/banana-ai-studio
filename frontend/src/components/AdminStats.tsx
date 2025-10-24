import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Coins, 
  Calendar,
  Download,
  RefreshCw,
  DollarSign,
  Activity,
  CreditCard,
  Clock,
  Target
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StatsData {
  totalUsers: number
  totalPointsIssued: number
  totalPointsSpent: number
  activeUsers: number
  totalRecharge: number
  pendingRecharges: number
  recentTransactions: any[]
  dailyStats: any[]
  userGrowthData: any[]
  pointsDistribution: any[]
  rechargeMethods: any[]
}

interface DateRange {
  start: string
  end: string
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // 获取统计数据
  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 获取用户统计
      const { data: users, error: usersError } = await supabase
        .from('user_points')
        .select('*')
      
      if (usersError) throw usersError

      // 获取交易记录
      const { data: transactions, error: transactionsError } = await supabase
        .from('point_transactions')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false })
      
      if (transactionsError) throw transactionsError

      // 获取充值记录
      const { data: recharges, error: rechargesError } = await supabase
        .from('recharge_records')
        .select('*')
        .gte('created_at', dateRange.start)
        .lte('created_at', `${dateRange.end}T23:59:59`)
      
      if (rechargesError) throw rechargesError

      // 计算统计数据
      const totalUsers = users?.length || 0
      const totalPointsIssued = users?.reduce((sum, user) => sum + (user.total_points || 0), 0) || 0
      const totalPointsSpent = users?.reduce((sum, user) => sum + (user.total_spent || 0), 0) || 0
      const activeUsers = users?.filter(user => {
        const lastActivity = new Date(user.updated_at || user.created_at)
        const daysDiff = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 7
      }).length || 0

      // 计算充值统计
      const totalRecharge = recharges?.filter(r => r.status === 'completed')
        .reduce((sum, r) => sum + (r.amount || 0), 0) || 0
      const pendingRecharges = recharges?.filter(r => r.status === 'pending').length || 0

      // 处理最近交易
      const recentTransactions = transactions?.slice(0, 10) || []

      // 生成每日统计数据
      const generateDailyStats = () => {
        const days = []
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d)
          const dayEnd = new Date(d)
          dayEnd.setHours(23, 59, 59, 999)
          
          const dayTransactions = transactions?.filter(t => {
            const tDate = new Date(t.created_at)
            return tDate >= dayStart && tDate <= dayEnd
          }) || []
          
          const dayRecharges = recharges?.filter(r => {
            const rDate = new Date(r.created_at)
            return rDate >= dayStart && rDate <= dayEnd && r.status === 'completed'
          }) || []
          
          days.push({
            date: d.toISOString().split('T')[0],
            transactions: dayTransactions.length,
            pointsSpent: dayTransactions
              .filter(t => t.type === 'spend' || t.type === 'admin_deduct')
              .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            pointsEarned: dayTransactions
              .filter(t => t.type === 'earn' || t.type === 'admin_add' || t.type === 'recharge')
              .reduce((sum, t) => sum + t.amount, 0),
            rechargeAmount: dayRecharges.reduce((sum, r) => sum + r.amount, 0),
            newUsers: users?.filter(u => {
              const uDate = new Date(u.created_at)
              return uDate >= dayStart && uDate <= dayEnd
            }).length || 0
          })
        }
        
        return days
      }

      // 用户增长数据
      const generateUserGrowth = () => {
        const usersByDate = new Map()
        const startDate = new Date(dateRange.start)
        const endDate = new Date(dateRange.end)
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          const cumulativeUsers = users?.filter(u => {
            const uDate = new Date(u.created_at)
            return uDate <= d
          }).length || 0
          
          usersByDate.set(dateStr, cumulativeUsers)
        }
        
        return Array.from(usersByDate.entries()).map(([date, count]) => ({
          date,
          users: count
        }))
      }

      // 积分分布数据
      const generatePointsDistribution = () => {
        const ranges = [
          { label: '0-100', min: 0, max: 100 },
          { label: '101-500', min: 101, max: 500 },
          { label: '501-1000', min: 501, max: 1000 },
          { label: '1001-2000', min: 1001, max: 2000 },
          { label: '2000+', min: 2001, max: Infinity }
        ]
        
        return ranges.map(range => {
          const count = users?.filter(u => {
            const points = u.current_points || 0
            return points >= range.min && points <= range.max
          }).length || 0
          
          return {
            label: range.label,
            count,
            percentage: totalUsers > 0 ? ((count / totalUsers) * 100).toFixed(1) : '0'
          }
        })
      }

      // 充值方式统计
      const generateRechargeMethods = () => {
        const methods = ['微信', '支付宝', '银行卡', '其他']
        return methods.map(method => {
          const count = recharges?.filter(r => 
            r.payment_method?.includes(method) && r.status === 'completed'
          ).length || 0
          
          const amount = recharges?.filter(r => 
            r.payment_method?.includes(method) && r.status === 'completed'
          ).reduce((sum, r) => sum + (r.amount || 0), 0) || 0
          
          return {
            method,
            count,
            amount,
            percentage: totalRecharge > 0 ? ((amount / totalRecharge) * 100).toFixed(1) : '0'
          }
        })
      }

      setStats({
        totalUsers,
        totalPointsIssued,
        totalPointsSpent,
        activeUsers,
        totalRecharge,
        pendingRecharges,
        recentTransactions,
        dailyStats: generateDailyStats(),
        userGrowthData: generateUserGrowth(),
        pointsDistribution: generatePointsDistribution(),
        rechargeMethods: generateRechargeMethods()
      })
    } catch (err: any) {
      console.error('获取统计数据失败:', err)
      setError(err.message || '获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  // 导出数据
  const exportData = () => {
    if (!stats) return
    
    const exportData = {
      dateRange,
      summary: {
        totalUsers: stats.totalUsers,
        totalPointsIssued: stats.totalPointsIssued,
        totalPointsSpent: stats.totalPointsSpent,
        activeUsers: stats.activeUsers,
        totalRecharge: stats.totalRecharge
      },
      dailyStats: stats.dailyStats,
      pointsDistribution: stats.pointsDistribution,
      rechargeMethods: stats.rechargeMethods
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-stats-${dateRange.start}-to-${dateRange.end}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-primary-600" />
          <span className="text-neutral-600">加载统计数据...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800">
          <span className="font-medium">加载失败</span>
        </div>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={fetchStats}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部控制 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">数据统计与报表</h2>
          <p className="text-sm text-neutral-600 mt-1">
            积分系统运营数据分析与可视化报表
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="text-neutral-500 text-sm">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={fetchStats}
            className="px-3 py-1 border border-neutral-300 text-neutral-700 rounded hover:bg-neutral-50 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
          
          <button
            onClick={exportData}
            className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总用户数</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                活跃用户 {stats?.activeUsers || 0} 人
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Coins className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总发放积分</p>
              <p className="text-2xl font-bold text-neutral-900">{stats?.totalPointsIssued || 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                已消费 {stats?.totalPointsSpent || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总充值金额</p>
              <p className="text-2xl font-bold text-neutral-900">¥{stats?.totalRecharge || 0}</p>
              <p className="text-xs text-neutral-500 mt-1">
                待处理 {stats?.pendingRecharges || 0} 笔
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">活跃率</p>
              <p className="text-2xl font-bold text-neutral-900">
                {stats?.totalUsers ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                近7天活跃
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 每日趋势图 */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            每日数据趋势
          </h3>
          <div className="space-y-3">
            {stats?.dailyStats.slice(-7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 text-xs text-neutral-500">
                    {new Date(day.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      {day.transactions}笔交易
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      +{day.pointsEarned}积分
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      -{day.pointsSpent}积分
                    </span>
                  </div>
                </div>
                <div className="text-sm text-neutral-600">
                  新增{day.newUsers}用户
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 积分分布 */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            积分分布
          </h3>
          <div className="space-y-3">
            {stats?.pointsDistribution.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 text-sm text-neutral-600">{item.label}</div>
                  <div className="flex-1 bg-neutral-200 rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-600">{item.count}人</span>
                  <span className="text-xs text-neutral-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 充值方式分布 */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            充值方式分布
          </h3>
          <div className="space-y-3">
            {stats?.rechargeMethods.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0">
                <div>
                  <div className="font-medium text-neutral-900">{method.method}</div>
                  <div className="text-xs text-neutral-500">{method.count}笔交易</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-neutral-900">¥{method.amount}</div>
                  <div className="text-xs text-neutral-500">{method.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 最近交易 */}
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            最近交易
          </h3>
          <div className="space-y-3">
            {stats?.recentTransactions.slice(0, 5).map((transaction, index) => (
              <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0">
                <div>
                  <div className="font-medium text-neutral-900 text-sm">
                    {transaction.user_email || '未知用户'}
                  </div>
                  <div className="text-xs text-neutral-500">{transaction.description}</div>
                </div>
                <div className="text-right">
                  <div className={`font-medium text-sm ${
                    transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {new Date(transaction.created_at).toLocaleString('zh-CN', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}