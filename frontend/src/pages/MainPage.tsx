import { useState } from 'react'
import { Pen, Box, Image as ImageIcon, LogOut, Coins, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LineArtGenerator from '../components/LineArtGenerator'
import MultiViewGenerator from '../components/MultiViewGenerator'
import BackgroundReplacer from '../components/BackgroundReplacer'
import PointsAccountModal from '../components/PointsAccountModal'

interface Transaction {
  id: string
  type: 'earn' | 'spend' | 'recharge'
  amount: number
  description: string
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
}

type Tab = 'line-art' | 'multi-view' | 'background'

// 图片状态类型
interface ImageState {
  file: File | null
  previewUrl: string
}

export default function MainPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>('line-art')
  
  // 所有功能共享的主图片状态
  const [sharedImage, setSharedImage] = useState<ImageState>({ file: null, previewUrl: '' })
  // 背景替换功能的背景图片（独立状态）
  const [backgroundImage, setBackgroundImage] = useState<ImageState>({ file: null, previewUrl: '' })
  // 全局生图加载状态
  const [isGenerating, setIsGenerating] = useState(false)
  // 每个功能的独立结果URL状态（防止切换tab时丢失）
  const [lineArtResult, setLineArtResult] = useState<string>('')
  const [multiViewResult, setMultiViewResult] = useState<string>('')
  const [backgroundResult, setBackgroundResult] = useState<string>('')

  // 积分系统状态
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [currentPoints, setCurrentPoints] = useState(150) // 当前可用积分
  const [totalPoints, setTotalPoints] = useState(500) // 总积分
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'recharge',
      amount: 100,
      description: '微信充值',
      timestamp: new Date('2024-01-15'),
      status: 'completed'
    },
    {
      id: '2',
      type: 'spend',
      amount: -20,
      description: '线稿图生成',
      timestamp: new Date('2024-01-14'),
      status: 'completed'
    },
    {
      id: '3',
      type: 'earn',
      amount: 50,
      description: '每日签到奖励',
      timestamp: new Date('2024-01-13'),
      status: 'completed'
    },
    {
      id: '4',
      type: 'spend',
      amount: -30,
      description: '三视图生成',
      timestamp: new Date('2024-01-12'),
      status: 'completed'
    },
    {
      id: '5',
      type: 'recharge',
      amount: 300,
      description: '管理员充值',
      timestamp: new Date('2024-01-10'),
      status: 'completed'
    }
  ])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('退出失败:', error)
    }
  }

  const tabs = [
    {
      id: 'line-art' as Tab,
      label: '线稿图',
      icon: Pen,
      color: 'text-secondary-500',
    },
    {
      id: 'multi-view' as Tab,
      label: '三视图',
      icon: Box,
      color: 'text-purple-500',
    },
    {
      id: 'background' as Tab,
      label: '换场景',
      icon: ImageIcon,
      color: 'text-green-500',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* 头部导航栏 */}
      <header className="bg-white border-b-2 border-neutral-300">
        <div className="max-w-[1400px] mx-auto px-xxxl h-32 flex items-center justify-between">
          <div className="flex items-center">
            <img src="/images/logo.png" alt="香蕉AI工作室" className="h-48 w-auto" />
            <h1 className="logo-text ml-lg">香蕉AI工作室</h1>
          </div>
          
          {/* 用户信息和积分账户 */}
          <div className="flex items-center gap-md">
            {/* 积分账户显示 */}
            <button
              onClick={() => setShowPointsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 border-2 border-primary-200 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <Coins className="w-4 h-4 text-primary-600" />
              <span className="text-primary-700 font-semibold">
                我的积分账户: {currentPoints}/{totalPoints}
              </span>
            </button>
            
            {/* 管理员入口 (仅在开发/测试环境显示) */}
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-neutral-300 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <Settings className="w-4 h-4 text-neutral-600" />
              <span className="text-neutral-700 font-semibold">管理后台</span>
            </button>
            
            <div className="user-info">
              <span className="text-neutral-700 font-semibold">{user?.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="logout-button flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">退出登录</span>
            </button>
          </div>
        </div>
      </header>

      {/* 主体区域：左侧Tab + 右侧内容 */}
      <div className="flex flex-1">
        {/* 左侧Tab导航 */}
        <aside className="w-[200px] bg-white border-r-2 border-neutral-300">
          <nav className="p-lg space-y-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button-base w-full flex items-center gap-md px-lg py-md rounded-lg ${
                    isActive 
                      ? 'tab-button-active' 
                      : 'tab-button-inactive'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : tab.color}`} />
                  <span className={`tab-text ${isActive ? 'tab-text-active' : 'tab-text-inactive'}`}>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* 右侧主内容区 */}
        <main className="flex-1 max-w-[1200px] mx-auto px-xxxl py-xxxl">
        {activeTab === 'line-art' && (
          <LineArtGenerator 
            imageState={sharedImage}
            setImageState={setSharedImage}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            resultUrl={lineArtResult}
            setResultUrl={setLineArtResult}
          />
        )}
        {activeTab === 'multi-view' && (
          <MultiViewGenerator 
            imageState={sharedImage}
            setImageState={setSharedImage}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            resultUrl={multiViewResult}
            setResultUrl={setMultiViewResult}
          />
        )}
        {activeTab === 'background' && (
          <BackgroundReplacer 
            subjectImage={sharedImage}
            setSubjectImage={setSharedImage}
            backgroundImage={backgroundImage}
            setBackgroundImage={setBackgroundImage}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            resultUrl={backgroundResult}
            setResultUrl={setBackgroundResult}
          />
        )}
        </main>
      </div>
      
      {/* 积分账户弹窗 */}
      <PointsAccountModal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        currentPoints={currentPoints}
        totalPoints={totalPoints}
        transactions={transactions}
      />
    </div>
  )
}
