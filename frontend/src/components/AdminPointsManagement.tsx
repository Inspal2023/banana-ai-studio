import { useState, useEffect } from 'react'
import { 
  Users, 
  Coins, 
  Plus, 
  Search, 
  Filter, 
  Download,
  Edit,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  QrCode,
  Phone,
  MessageCircle,
  UserCog,
  Crown,
  Shield,
  Save
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ImageUpload from './ImageUpload'

interface User {
  id: string
  email: string
  currentPoints: number
  totalPoints: number
  totalSpent: number
  lastActivity: Date
  registrationDate: Date
}

interface Transaction {
  id: string
  userId: string
  userEmail: string
  type: 'earn' | 'spend' | 'recharge' | 'admin_add' | 'admin_deduct'
  amount: number
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
}

interface AdminPointsProps {
  users: User[]
  transactions: Transaction[]
  onAddPoints: (userId: string, amount: number, reason: string) => void
  onDeductPoints: (userId: string, amount: number, reason: string) => void
  onUpdateUserPoints: (userId: string, newPoints: number) => void
}

interface AdminSettings {
  id: string
  email: string
  role: 'admin' | 'super_admin'
  wechatQRCode?: string
  contactInfo?: {
    wechat?: string
    qq?: string
    phone?: string
    email?: string
  }
  rechargeInstructions?: string
  createdAt: Date
  updatedAt: Date
}

export default function AdminPointsManagement({ 
  users, 
  transactions, 
  onAddPoints, 
  onDeductPoints,
  onUpdateUserPoints 
}: AdminPointsProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'users' | 'transactions' | 'settings' | 'wechat'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [pointsAmount, setPointsAmount] = useState('')
  const [reason, setReason] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  // 管理员设置相关状态
  const [adminSettings, setAdminSettings] = useState<AdminSettings[]>([
    {
      id: '1',
      email: 'admin1@example.com',
      role: 'super_admin',
      wechatQRCode: '',
      contactInfo: {
        wechat: '',
        qq: '',
        phone: '',
        email: ''
      },
      rechargeInstructions: '请扫描下方微信二维码进行充值，充值后请联系管理员确认。',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      email: 'admin2@example.com',
      role: 'admin',
      wechatQRCode: '',
      contactInfo: {
        wechat: '',
        qq: '',
        phone: '',
        email: ''
      },
      rechargeInstructions: '请扫描下方微信二维码进行充值，充值后请联系管理员确认。',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ])
  
  const [selectedAdminId, setSelectedAdminId] = useState<string>('1')
  const [uploadedQRCode, setUploadedQRCode] = useState<string>('')
  const [contactInfo, setContactInfo] = useState<{
    wechat?: string
    qq?: string
    phone?: string
    email?: string
  }>({})
  const [rechargeInstructions, setRechargeInstructions] = useState('')

  // 获取当前管理员信息
  const currentAdmin = adminSettings.find(admin => admin.id === selectedAdminId)
  const isSuperAdmin = currentAdmin?.role === 'super_admin'

  // 过滤用户
  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 过滤交易记录
  const filteredTransactions = transactions.filter(transaction =>
    transaction.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddPoints = async () => {
    if (!selectedUser || !pointsAmount || !reason) return
    
    setIsAdding(true)
    try {
      await onAddPoints(selectedUser, parseInt(pointsAmount), reason)
      setSelectedUser('')
      setPointsAmount('')
      setReason('')
    } catch (error) {
      console.error('添加积分失败:', error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeductPoints = async () => {
    if (!selectedUser || !pointsAmount || !reason) return
    
    setIsAdding(true)
    try {
      await onDeductPoints(selectedUser, parseInt(pointsAmount), reason)
      setSelectedUser('')
      setPointsAmount('')
      setReason('')
    } catch (error) {
      console.error('扣除积分失败:', error)
    } finally {
      setIsAdding(false)
    }
  }

  // 处理二维码上传
  const handleQRCodeUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setUploadedQRCode(result)
    }
    reader.readAsDataURL(file)
  }

  // 删除二维码
  const handleRemoveQRCode = () => {
    setUploadedQRCode('')
  }

  // 保存管理员设置
  const handleSaveAdminSettings = () => {
    if (!currentAdmin) return

    const updatedSettings = adminSettings.map(admin => {
      if (admin.id === selectedAdminId) {
        return {
          ...admin,
          wechatQRCode: uploadedQRCode,
          contactInfo: contactInfo,
          rechargeInstructions: rechargeInstructions,
          updatedAt: new Date()
        }
      }
      return admin
    })

    setAdminSettings(updatedSettings)
    alert('设置保存成功！')
  }

  // 当选中的管理员改变时，重新加载数据
  useEffect(() => {
    if (currentAdmin) {
      if (currentAdmin.contactInfo) {
        setContactInfo(currentAdmin.contactInfo)
      } else {
        setContactInfo({
          wechat: '',
          qq: '',
          phone: '',
          email: ''
        })
      }
      
      setRechargeInstructions(currentAdmin.rechargeInstructions || '')
      setUploadedQRCode(currentAdmin.wechatQRCode || '')
    }
  }, [selectedAdminId])

  const getTransactionTypeText = (type: Transaction['type']) => {
    switch (type) {
      case 'earn':
        return '获得'
      case 'spend':
        return '消费'
      case 'recharge':
        return '充值'
      case 'admin_add':
        return '管理员添加'
      case 'admin_deduct':
        return '管理员扣除'
      default:
        return '未知'
    }
  }

  const getTransactionTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'earn':
      case 'admin_add':
        return 'text-semantic-success'
      case 'spend':
      case 'admin_deduct':
        return 'text-semantic-error'
      case 'recharge':
        return 'text-semantic-info'
      default:
        return 'text-neutral-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* 头部统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总用户数</p>
              <p className="text-2xl font-bold text-neutral-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Coins className="w-6 h-6 text-semantic-success" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总积分发放</p>
              <p className="text-2xl font-bold text-neutral-900">
                {users.reduce((sum, user) => sum + user.totalPoints, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-semantic-error" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">总消费积分</p>
              <p className="text-2xl font-bold text-neutral-900">
                {users.reduce((sum, user) => sum + user.totalSpent, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-semantic-info" />
            </div>
            <div>
              <p className="text-sm text-neutral-600">活跃用户</p>
              <p className="text-2xl font-bold text-neutral-900">
                {users.filter(user => 
                  new Date().getTime() - user.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000
                ).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            用户管理
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'transactions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            交易记录
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            系统设置
          </button>
          <button
            onClick={() => setActiveTab('wechat')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'wechat'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <QrCode className="w-4 h-4" />
            微信二维码
          </button>
        </nav>
      </div>

      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索用户或交易..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2">
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* 手动添加积分表单 */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">手动积分管理</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">选择用户</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                placeholder="积分数量"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <input
                type="text"
                placeholder="操作原因"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              
              <button
                onClick={handleAddPoints}
                disabled={isAdding || !selectedUser || !pointsAmount || !reason}
                className="px-4 py-2 bg-semantic-success hover:bg-green-600 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加积分
              </button>
              
              <button
                onClick={handleDeductPoints}
                disabled={isAdding || !selectedUser || !pointsAmount || !reason}
                className="px-4 py-2 bg-semantic-error hover:bg-red-600 disabled:bg-neutral-300 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                扣除积分
              </button>
            </div>
          </div>

          {/* 用户列表 */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      用户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      当前积分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      总积分
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      总消费
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      最后活动
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{user.email}</div>
                          <div className="text-sm text-neutral-500">
                            注册时间: {user.registrationDate.toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-primary-600">{user.currentPoints}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">{user.totalPoints}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-semantic-error">{user.totalSpent}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {user.lastActivity.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-neutral-600 hover:text-neutral-900">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    积分
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    状态
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {transaction.userEmail}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getTransactionTypeColor(transaction.type)}`}>
                        {getTransactionTypeText(transaction.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        transaction.amount > 0 ? 'text-semantic-success' : 'text-semantic-error'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                      {transaction.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {transaction.timestamp.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'completed' ? '已完成' : 
                         transaction.status === 'pending' ? '处理中' : '失败'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">积分系统设置</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    新用户初始积分
                  </label>
                  <input
                    type="number"
                    defaultValue={100}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    每日签到奖励积分
                  </label>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    线稿图生成消耗积分
                  </label>
                  <input
                    type="number"
                    defaultValue={20}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    三视图生成消耗积分
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
                  保存设置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wechat' && (
        <div className="space-y-6">
          {/* 权限提示 */}
          {!isSuperAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Shield className="w-5 h-5" />
                <span className="font-medium">权限说明</span>
              </div>
              <p className="text-yellow-700 mt-2 text-sm">
                您只能管理自己的微信二维码和联系信息设置。如需管理其他管理员设置，请联系超级管理员。
              </p>
            </div>
          )}

          {/* 管理员选择器（超级管理员可见） */}
          {isSuperAdmin && (
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                管理员管理
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    选择管理员
                  </label>
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {adminSettings.map(admin => (
                      <option key={admin.id} value={admin.id}>
                        <div className="flex items-center gap-2">
                          {admin.role === 'super_admin' ? <Crown className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                          {admin.email} ({admin.role === 'super_admin' ? '超级管理员' : '管理员'})
                        </div>
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-neutral-600">
                    当前选择：{currentAdmin?.email}
                    {currentAdmin?.role === 'super_admin' && (
                      <span className="ml-2 inline-flex items-center gap-1 text-yellow-600">
                        <Crown className="w-4 h-4" />
                        超级管理员
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 微信二维码管理 */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              微信二维码设置
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 左侧：二维码上传 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    微信收款二维码
                  </label>
                  <ImageUpload
                    onImageSelect={handleQRCodeUpload}
                    onImageRemove={handleRemoveQRCode}
                    previewUrl={uploadedQRCode}
                    label="点击上传微信收款二维码"
                    accept="image/*"
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    支持 JPG、PNG 格式，建议尺寸 200x200 像素
                  </p>
                </div>
              </div>

              {/* 右侧：联系信息和说明 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    联系信息
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="微信号（可选）"
                      value={contactInfo.wechat}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, wechat: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      placeholder="QQ号（可选）"
                      value={contactInfo.qq}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, qq: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="tel"
                      placeholder="手机号（可选）"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      placeholder="邮箱（可选）"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    充值说明
                  </label>
                  <textarea
                    placeholder="请输入充值说明..."
                    value={rechargeInstructions}
                    onChange={(e) => setRechargeInstructions(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="mt-6 pt-4 border-t border-neutral-200">
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAdminSettings}
                  className="px-6 py-2 bg-semantic-success hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存设置
                </button>
              </div>
            </div>
          </div>

          {/* 预览区域 */}
          {uploadedQRCode && (
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">用户端预览</h3>
              <div className="bg-neutral-50 rounded-lg p-6">
                <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto">
                      <img 
                        src={uploadedQRCode} 
                        alt="微信二维码" 
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="text-sm text-neutral-600 space-y-2">
                      <p className="font-medium text-neutral-900">扫描二维码进行充值</p>
                      {contactInfo.wechat && (
                        <p>微信号：{contactInfo.wechat}</p>
                      )}
                      {contactInfo.phone && (
                        <p>手机号：{contactInfo.phone}</p>
                      )}
                    </div>
                    {rechargeInstructions && (
                      <div className="text-xs text-neutral-500 bg-neutral-50 rounded p-3">
                        {rechargeInstructions}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 管理员列表（超级管理员可见） */}
          {isSuperAdmin && (
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">所有管理员设置</h3>
              <div className="space-y-4">
                {adminSettings.map(admin => (
                  <div key={admin.id} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {admin.role === 'super_admin' ? (
                          <Crown className="w-5 h-5 text-yellow-500" />
                        ) : (
                          <UserCog className="w-5 h-5 text-blue-500" />
                        )}
                        <span className="font-medium">{admin.email}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          admin.role === 'super_admin' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {admin.role === 'super_admin' ? '超级管理员' : '管理员'}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedAdminId(admin.id)}
                        className="px-3 py-1 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors"
                      >
                        编辑
                      </button>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <p>微信二维码：{admin.wechatQRCode ? '已设置' : '未设置'}</p>
                      <p>联系信息：{
                        Object.values(admin.contactInfo || {}).filter(v => v).length > 0 
                          ? '已设置' 
                          : '未设置'
                      }</p>
                      <p>充值说明：{admin.rechargeInstructions ? '已设置' : '未设置'}</p>
                      <p>更新时间：{admin.updatedAt.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}