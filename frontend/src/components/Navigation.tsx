import { Banana } from 'lucide-react'

type Tab = 'line-art' | 'multi-view' | 'background'

interface NavigationProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'line-art', label: '线稿图生成' },
    { id: 'multi-view', label: '三视图生成' },
    { id: 'background', label: '背景替换' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/15 backdrop-blur-lg border-b border-white/30 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-18">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <Banana className="w-6 h-6 text-neutral-900" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-50">香蕉AI工作室</h1>
          </div>

          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-3 rounded-lg text-base font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-500 border border-primary-500/40'
                    : 'text-neutral-300 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}