import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  message?: string
  showMessage?: boolean
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  message = '加载中...',
  showMessage = true 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4'
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      className
    )}>
      <div 
        className={cn(
          'animate-spin rounded-full border-b-2 border-green-600 mb-4',
          sizeClasses[size]
        )}
        role="status"
        aria-label="正在加载"
      />
      {showMessage && (
        <p className="text-sm font-medium text-neutral-600 animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}

// 全屏加载组件
export function FullScreenLoading({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-100 z-50">
      <LoadingSpinner message={message} size="lg" />
    </div>
  )
}

// 页面级加载组件
export function PageLoading({ message = '正在加载页面...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner message={message} />
    </div>
  )
}