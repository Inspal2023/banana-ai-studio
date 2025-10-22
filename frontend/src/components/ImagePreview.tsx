import { Download, ZoomIn } from 'lucide-react'
import { useState } from 'react'

interface ImagePreviewProps {
  imageUrl: string
  onDownload?: () => void
  onZoom?: () => void
}

export default function ImagePreview({ imageUrl, onDownload, onZoom }: ImagePreviewProps) {
  const [isZoomed, setIsZoomed] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    // 立即阻止所有事件传播和默认行为
    e.stopPropagation() // 阻止事件冒泡到父元素
    e.preventDefault() // 阻止浏览器默认行为
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation() // 阻止同一元素上的其他监听器
    }
    
    // 异步执行下载，但不阻塞事件处理
    setTimeout(async () => {
      try {
        // 使用fetch获取图片blob
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        })
        
        if (!response.ok) throw new Error('Download failed')
        
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        // 创建临时下载链接
        const a = document.createElement('a')
        a.href = url
        a.download = `banana-ai-${Date.now()}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        // 清理临时URL
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('Download error:', error)
        // 如果fetch失败，使用传统方式
        const a = document.createElement('a')
        a.href = imageUrl
        a.download = `banana-ai-${Date.now()}.png`
        a.target = '_blank'
        a.click()
      }
    }, 0)
  }

  const handleZoomClick = (e: React.MouseEvent) => {
    // 立即阻止所有事件传播和默认行为
    e.stopPropagation()
    e.preventDefault()
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation() // 阻止同一元素上的其他监听器
    }
    
    if (onZoom) {
      onZoom()
    } else {
      setIsZoomed(true)
    }
  }

  return (
    <>
      <div className="relative group">
        <img 
          src={imageUrl} 
          alt="Generated" 
          className="w-full h-auto rounded-md border-2 border-neutral-300"
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
        />
        
        <div className="absolute top-lg right-lg flex gap-md opacity-0 group-hover:opacity-100 transition-opacity duration-normal">
          <button
            onClick={handleZoomClick}
            className="w-11 h-11 bg-neutral-900/80 hover:bg-neutral-900 rounded-md flex items-center justify-center transition-all hover:scale-105"
            title="放大预览"
          >
            <ZoomIn className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleDownload}
            className="w-11 h-11 bg-neutral-900/80 hover:bg-neutral-900 rounded-md flex items-center justify-center transition-all hover:scale-105"
            title="下载图片"
          >
            <Download className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 放大预览模态框 */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-xxl"
          onClick={() => setIsZoomed(false)}
        >
          <img 
            src={imageUrl} 
            alt="Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-modal"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
          <button
            className="absolute top-xxl right-xxl text-white text-4xl hover:text-neutral-300 w-11 h-11 flex items-center justify-center"
            onClick={() => setIsZoomed(false)}
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}