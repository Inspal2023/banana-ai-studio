import React, { useCallback, useId, useState, useRef, memo } from 'react'
import { Upload, Trash2, AlertCircle, X } from 'lucide-react'
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove?: () => void
  previewUrl?: string
  label?: string
  accept?: string
  maxSize?: number // 最大文件大小(MB)
  disabled?: boolean
  className?: string
}

// 图片验证错误类型
interface ImageError {
  type: 'size' | 'type' | 'generic'
  message: string
}

// 文件信息接口
interface FileInfo {
  file: File
  url: string
  size: number
  type: string
}

// 图片优化参数
interface ImageOptimization {
  quality: number
  maxWidth: number
  maxHeight: number
}

const DEFAULT_MAX_SIZE = 10 // 10MB
const DEFAULT_OPTIMIZATION: ImageOptimization = {
  quality: 0.8,
  maxWidth: 1920,
  maxHeight: 1080
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// 性能优化的ImageUpload组件
const ImageUploadBase = ({ 
  onImageSelect,
  onImageRemove,
  previewUrl = '',
  label = '点击上传或拖拽图片到此处', 
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = DEFAULT_MAX_SIZE,
  disabled = false,
  className = ''
}: ImageUploadProps) => {
  const uploadId = useId()
  const reuploadId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [error, setError] = useState<ImageError | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // 性能监控
  const { measureRender, measureAsync } = usePerformanceMonitor({
    componentName: 'ImageUpload',
    enabled: import.meta.env.DEV
  })

  // 重置错误状态
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // 验证文件
  const validateFile = useCallback((file: File): ImageError | null => {
    // 检查文件类型
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return {
        type: 'type',
        message: `不支持的文件格式。请选择 ${ACCEPTED_TYPES.join(', ')} 格式的图片。`
      }
    }

    // 检查文件大小
    const maxSizeBytes = maxSize * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return {
        type: 'size',
        message: `文件大小超过限制。当前限制为 ${maxSize}MB，文件大小为 ${(file.size / 1024 / 1024).toFixed(2)}MB。`
      }
    }

    return null
  }, [maxSize])

  // 优化图片
  const optimizeImage = useCallback(async (file: File): Promise<FileInfo> => {
    setIsOptimizing(true)
    
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // 计算新尺寸
            let { width, height } = img
            
            if (width > DEFAULT_OPTIMIZATION.maxWidth || height > DEFAULT_OPTIMIZATION.maxHeight) {
              const ratio = Math.min(
                DEFAULT_OPTIMIZATION.maxWidth / width,
                DEFAULT_OPTIMIZATION.maxHeight / height
              )
              width *= ratio
              height *= ratio
            }
            
            canvas.width = width
            canvas.height = height
            
            // 绘制图片
            ctx?.drawImage(img, 0, 0, width, height)
            
            // 转换为Blob
            canvas.toBlob((blob) => {
              if (blob) {
                const optimizedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                })
                
                const url = URL.createObjectURL(blob)
                
                resolve({
                  file: optimizedFile,
                  url,
                  size: blob.size,
                  type: file.type
                })
              } else {
                reject(new Error('图片优化失败'))
              }
            }, file.type, DEFAULT_OPTIMIZATION.quality)
          } catch (err) {
            reject(err)
          } finally {
            setIsOptimizing(false)
          }
        }
        
        img.onerror = () => {
          setIsOptimizing(false)
          reject(new Error('图片加载失败'))
        }
        
        img.src = URL.createObjectURL(file)
      })
    } catch (err) {
      setIsOptimizing(false)
      throw err
    }
  }, [])

  // 处理文件选择
  const handleFileSelect = useCallback(async (file: File) => {
    const startTime = measureRender()
    
    try {
      clearError()
      
      // 验证文件
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }

      // 优化图片
      const fileInfo = await measureAsync(
        () => optimizeImage(file),
        '图片优化'
      )
      
      // 通知父组件
      onImageSelect(fileInfo.file)
      
    } catch (err) {
      console.error('图片处理失败:', err)
      setError({
        type: 'generic',
        message: '图片处理失败，请重试'
      })
    } finally {
      if (startTime) {
        const endTime = performance.now()
        const duration = endTime - startTime
        if (duration > 16) {
          console.warn(`⚠️  图片处理时间过长: ${duration.toFixed(2)}ms`)
        }
      }
    }
  }, [onImageSelect, validateFile, optimizeImage, measureRender, measureAsync])

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      
      if (disabled) return

      const files = Array.from(e.dataTransfer.files)
      const file = files[0]
      
      if (file) {
        await handleFileSelect(file)
      }
    },
    [handleFileSelect, disabled]
  )

  // 文件输入处理
  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await handleFileSelect(file)
      }
      // 重置input，允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelect]
  )

  // 删除图片处理
  const handleRemove = useCallback(() => {
    if (onImageRemove) {
      clearError()
      onImageRemove()
    }
  }, [onImageRemove, clearError])

  // 错误重试
  const handleRetry = useCallback(() => {
    clearError()
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [clearError])

  return (
    <div className={`image-upload-container ${className}`}>
      {previewUrl ? (
        // 已上传图片预览
        <div className="relative border-2 border-neutral-300 rounded-md overflow-hidden group">
          <img 
            src={previewUrl} 
            alt="预览图片" 
            className="w-full h-auto transition-transform duration-200 group-hover:scale-105" 
            loading="lazy"
          />
          
          {/* 操作覆盖层 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-md">
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              id={reuploadId}
              ref={fileInputRef}
              disabled={disabled}
            />
            
            <label 
              htmlFor={reuploadId} 
              className={`cursor-pointer bg-white/90 hover:bg-white p-lg rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 ${
                disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              aria-label="重新上传图片"
            >
              <Upload className="w-6 h-6 text-primary-500" />
            </label>
            
            {onImageRemove && (
              <button
                onClick={handleRemove}
                className="cursor-pointer bg-white/90 hover:bg-white p-lg rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100"
                type="button"
                aria-label="删除图片"
              >
                <Trash2 className="w-6 h-6 text-red-500" />
              </button>
            )}
          </div>
          
          {/* 优化进度 */}
          {isOptimizing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 flex items-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="text-sm font-medium">正在优化图片...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 上传区域
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`upload-area-elevated w-full h-60 flex flex-col items-center justify-center gap-md cursor-pointer border-2 border-dashed transition-all duration-200 ${
            isDragOver 
              ? 'upload-area-dragover border-primary-400 bg-primary-50' 
              : 'border-neutral-300 hover:border-primary-300'
          } ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (!disabled && fileInputRef.current) {
                fileInputRef.current.click()
              }
            }
          }}
          aria-label="图片上传区域"
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            id={uploadId}
            ref={fileInputRef}
            disabled={disabled}
          />
          
          <label 
            htmlFor={uploadId} 
            className={`cursor-pointer flex flex-col items-center ${disabled ? 'cursor-not-allowed' : ''}`}
          >
            <Upload className="w-12 h-12 text-secondary-500 mb-md transition-transform duration-200 hover:scale-110" />
            <p className="text-base text-neutral-900 text-center font-medium">
              {isOptimizing ? '正在处理图片...' : label}
            </p>
            <p className="description-text-gradient text-sm text-neutral-600 mt-sm">
              支持 JPEG, PNG, WebP 格式，最大 {maxSize}MB
            </p>
          </label>
          
          {isOptimizing && (
            <div className="absolute bottom-2 right-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>
      )}
      
      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700">{error.message}</p>
              {error.type !== 'type' && (
                <button
                  onClick={handleRetry}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  重新选择
                </button>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600"
              aria-label="关闭错误提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 使用memo优化组件性能
const ImageUpload = memo(ImageUploadBase)
ImageUpload.displayName = 'ImageUpload'

export default ImageUpload
