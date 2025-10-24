import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AdminPointsManagement from '../components/AdminPointsManagement'

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

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // 模拟数据
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'user1@example.com',
      currentPoints: 150,
      totalPoints: 500,
      totalSpent: 350,
      lastActivity: new Date('2024-01-15'),
      registrationDate: new Date('2024-01-01')
    },
    {
      id: '2',
      email: 'user2@example.com',
      currentPoints: 80,
      totalPoints: 200,
      totalSpent: 120,
      lastActivity: new Date('2024-01-14'),
      registrationDate: new Date('2024-01-02')
    },
    {
      id: '3',
      email: 'user3@example.com',
      currentPoints: 300,
      totalPoints: 600,
      totalSpent: 300,
      lastActivity: new Date('2024-01-13'),
      registrationDate: new Date('2024-01-03')
    }
  ])

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      userId: '1',
      userEmail: 'user1@example.com',
      type: 'admin_add',
      amount: 50,
      description: '管理员奖励',
      timestamp: new Date('2024-01-15'),
      status: 'completed'
    },
    {
      id: '2',
      userId: '2',
      userEmail: 'user2@example.com',
      type: 'recharge',
      amount: 200,
      description: '微信充值',
      timestamp: new Date('2024-01-14'),
      status: 'completed'
    },
    {
      id: '3',
      userId: '1',
      userEmail: 'user1@example.com',
      type: 'spend',
      amount: -20,
      description: '线稿图生成',
      timestamp: new Date('2024-01-13'),
      status: 'completed'
    },
    {
      id: '4',
      userId: '3',
      userEmail: 'user3@example.com',
      type: 'admin_deduct',
      amount: -100,
      description: '违规扣除',
      timestamp: new Date('2024-01-12'),
      status: 'completed'
    },
    {
      id: '5',
      userId: '2',
      userEmail: 'user2@example.com',
      type: 'earn',
      amount: 10,
      description: '每日签到奖励',
      timestamp: new Date('2024-01-11'),
      status: 'completed'
    }
  ])

  const handleAddPoints = async (userId: string, amount: number, reason: string) => {
    // 模拟添加积分
    const user = users.find(u => u.id === userId)
    if (user) {
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { 
              ...u, 
              currentPoints: u.currentPoints + amount,
              totalPoints: u.totalPoints + amount 
            }
          : u
      ))
      
      setTransactions(prev => [...prev, {
        id: Date.now().toString(),
        userId,
        userEmail: user.email,
        type: 'admin_add',
        amount,
        description: reason,
        timestamp: new Date(),
        status: 'completed'
      }])
    }
  }

  const handleDeductPoints = async (userId: string, amount: number, reason: string) => {
    // 模拟扣除积分
    const user = users.find(u => u.id === userId)
    if (user) {
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { 
              ...u, 
              currentPoints: Math.max(0, u.currentPoints - amount),
              totalSpent: u.totalSpent + amount 
            }
          : u
      ))
      
      setTransactions(prev => [...prev, {
        id: Date.now().toString(),
        userId,
        userEmail: user.email,
        type: 'admin_deduct',
        amount: -amount,
        description: reason,
        timestamp: new Date(),
        status: 'completed'
      }])
    }
  }

  const handleUpdateUserPoints = (userId: string, newPoints: number) => {
    // 模拟更新用户积分
    setUsers(prev => prev.map(u => 
      u.id === userId 
        ? { 
            ...u, 
            currentPoints: newPoints 
          }
        : u
    ))
  }

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
              <h1 className="text-2xl font-bold text-neutral-900">管理员后台</h1>
            </div>
            <div className="text-sm text-neutral-500">
              <div className="text-right">
                <p>积分系统管理</p>
                <p className="text-xs text-neutral-400">当前管理员：{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 管理员内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <AdminPointsManagement
          users={users}
          transactions={transactions}
          onAddPoints={handleAddPoints}
          onDeductPoints={handleDeductPoints}
          onUpdateUserPoints={handleUpdateUserPoints}
        />
      </main>
    </div>
  )
}