import React, { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react'
import { Pen, Box, Image as ImageIcon, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LineArtGenerator from '../components/LineArtGenerator'
import MultiViewGenerator from '../components/MultiViewGenerator'
import BackgroundReplacer from '../components/BackgroundReplacer'
import { LoadingSpinner } from '../components/LoadingSpinner'

type Tab = 'line-art' | 'multi-view' | 'background'

// 图片状态类型
interface ImageState {
  file: File | null
  previewUrl: string
}

// 缓存的Tab配置
const TABS_CONFIG = [
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
] as const

// Tab组件 - 使用memo优化
const TabButton = memo(({ 
  tab, 
  isActive, 
  onClick 
}: { 
  tab: typeof TABS_CONFIG[number]
  isActive: boolean
  onClick: () => void 
}) => {
  const Icon = tab.icon
  
  return (
    <button
      onClick={onClick}
      className={`tab-button-base w-full flex items-center gap-md px-lg py-md rounded-lg transition-all duration-200 ${
        isActive 
          ? 'tab-button-active shadow-md transform scale-105' 
          : 'tab-button-inactive hover:scale-102'
      }`}
      aria-pressed={isActive}
      aria-label={`切换到${tab.label}功能`}
    >
      <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-white' : tab.color}`} />
      <span className={`tab-text font-medium ${isActive ? 'tab-text-active' : 'tab-text-inactive'}`}>
        {tab.label}
      </span>
    </button>
  )
})

TabButton.displayName = 'TabButton'

// 头部组件 - 使用memo优化
const Header = memo(({ 
  user, 
  onLogout, 
  onNavigate
}: {
  user: any
  onLogout: () => void
  onNavigate: (path: string) => void
}) => {
  const logoutRef = useRef<HTMLButtonElement>(null)
  
  // 性能监控
  useEffect(() => {
    performance.mark('component-header-start')
    return () => {
      performance.mark('component-header-end')
      performance.measure('component-header', 'component-header-start', 'component-header-end')
    }
  }, [])
  
  return (
    <header className="bg-white border-b-2 border-neutral-300 shadow-sm">
      <div className="max-w-[1400px] mx-auto px-xxxl h-32 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/images/logo.png" 
            alt="香蕉AI工作室" 
            className="h-48 w-auto transition-transform duration-300 hover:scale-105" 
          />
          <h1 className="logo-text ml-lg">香蕉AI工作室</h1>
        </div>
        
        <div className="flex items-center gap-md">
          <div className="user-info">
            <span className="text-neutral-700 font-semibold">{user?.email}</span>
          </div>
          <button 
            ref={logoutRef}
            onClick={onLogout}
            className="logout-button flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-300 rounded-lg hover:bg-red-100 transition-all duration-200 hover:scale-105"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-semibold">退出登录</span>
          </button>
        </div>
      </div>
    </header>
  )
})

Header.displayName = 'Header'

// 侧边栏组件 - 使用memo优化
const Sidebar = memo(({ 
  activeTab, 
  onTabChange 
}: { 
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) => {
  return (
    <aside className="w-[200px] bg-white border-r-2 border-neutral-300">
      <nav className="p-lg space-y-sm">
        {TABS_CONFIG.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </nav>
    </aside>
  )
})

Sidebar.displayName = 'Sidebar'

// 主页面组件
export default function MainPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  
  // 使用useRef优化频繁变化的状态
  const stateRef = useRef({
    activeTab: 'line-art' as Tab,
    isGenerating: false,
    lineArtResult: '',
    multiViewResult: '',
    backgroundResult: '',
  })
  
  const [sharedImage, setSharedImage] = useState<ImageState>({ file: null, previewUrl: '' })
  const [backgroundImage, setBackgroundImage] = useState<ImageState>({ file: null, previewUrl: '' })
  
  // 使用useCallback优化事件处理函数
  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('退出失败:', error)
    }
  }, [signOut])

  const handleTabChange = useCallback((tab: Tab) => {
    performance.mark('tab-change-start')
    stateRef.current.activeTab = tab
    // 使用状态更新来触发重新渲染
    setActiveTab(tab)
    performance.mark('tab-change-end')
    performance.measure('tab-change', 'tab-change-start', 'tab-change-end')
  }, [])

  const handleNavigate = useCallback((path: string) => {
    navigate(path)
  }, [navigate])

  // 使用useMemo优化计算属性
  const tabs = useMemo(() => TABS_CONFIG, [])
  
  // 使用useState来管理需要触发渲染的状态
  const [activeTab, setActiveTab] = useState<Tab>(stateRef.current.activeTab)
  const [isGenerating, setIsGenerating] = useState(stateRef.current.isGenerating)
  const [lineArtResult, setLineArtResult] = useState(stateRef.current.lineArtResult)
  const [multiViewResult, setMultiViewResult] = useState(stateRef.current.multiViewResult)
  const [backgroundResult, setBackgroundResult] = useState(stateRef.current.backgroundResult)
  
  // 同步ref和state
  useEffect(() => {
    stateRef.current = {
      ...stateRef.current,
      activeTab,
      isGenerating,
      lineArtResult,
      multiViewResult,
      backgroundResult
    }
  }, [activeTab, isGenerating, lineArtResult, multiViewResult, backgroundResult])

  // 性能监控
  useEffect(() => {
    performance.mark('component-mainpage-start')
    return () => {
      performance.mark('component-mainpage-end')
      performance.measure('component-mainpage', 'component-mainpage-start', 'component-mainpage-end')
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      <div className="flex flex-1">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        <main className="flex-1 max-w-[1200px] mx-auto px-xxxl py-xxxl">
          <React.Suspense fallback={<LoadingSpinner message="正在加载功能..." />}>
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
          </React.Suspense>
        </main>
      </div>
    </div>
  )
}
