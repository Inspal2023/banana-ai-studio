import { useState } from 'react'
import { Pen, Box, Image as ImageIcon } from 'lucide-react'
import LineArtGenerator from './components/LineArtGenerator'
import MultiViewGenerator from './components/MultiViewGenerator'
import BackgroundReplacer from './components/BackgroundReplacer'

type Tab = 'line-art' | 'multi-view' | 'background'

// 图片状态类型
interface ImageState {
  file: File | null
  previewUrl: string
}

function App() {
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
      {/* 头部导航栏 - 只包含LOGO和标题 */}
      <header className="bg-white border-b-2 border-neutral-300">
        <div className="max-w-[1400px] mx-auto px-xxxl h-32 flex items-center">
          <img src="/images/logo.png" alt="香蕉AI工作室" className="h-32 w-auto" />
          <h1 className="logo-text ml-lg">香蕉AI工作室</h1>
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
    </div>
  )
}

export default App
