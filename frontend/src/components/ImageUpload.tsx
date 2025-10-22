import { Upload, Trash2 } from 'lucide-react'
import { useCallback, useId, useState } from 'react'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  onImageRemove?: () => void  // 删除图片的回调
  previewUrl?: string  // 已上传图片的预览URL
  label?: string
  accept?: string
}

export default function ImageUpload({ 
  onImageSelect,
  onImageRemove,
  previewUrl = '',
  label = '点击上传或拖拽图片到此处', 
  accept = 'image/jpeg,image/png,image/webp' 
}: ImageUploadProps) {
  const uploadId = useId()
  const reuploadId = useId()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        onImageSelect(file)
      }
    },
    [onImageSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        onImageSelect(file)
      }
      // 重置input，允许重新选择相同文件
      e.target.value = ''
    },
    [onImageSelect]
  )

  return (
    <div>
      {previewUrl ? (
        // 已上传图片，显示预览和上传图标
        <div className="relative border-2 border-neutral-300 rounded-md overflow-hidden group">
          <img src={previewUrl} alt="Preview" className="w-full h-auto" />
          
          {/* 图标覆盖层：重新上传 + 删除 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-normal flex items-center justify-center gap-md">
            <input
              type="file"
              accept={accept}
              onChange={handleChange}
              className="hidden"
              id={reuploadId}
            />
            <label 
              htmlFor={reuploadId} 
              className="cursor-pointer bg-white/90 hover:bg-white p-lg rounded-full shadow-card transition-all duration-fast opacity-0 group-hover:opacity-100"
            >
              <Upload className="w-6 h-6 text-primary-500" />
            </label>
            {onImageRemove && (
              <button
                onClick={onImageRemove}
                className="cursor-pointer bg-white/90 hover:bg-white p-lg rounded-full shadow-card transition-all duration-fast opacity-0 group-hover:opacity-100"
                type="button"
              >
                <Trash2 className="w-6 h-6 text-semantic-error" />
              </button>
            )}
          </div>
        </div>
      ) : (
        // 未上传图片，显示上传区域
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`upload-area-elevated w-full h-60 flex flex-col items-center justify-center gap-md cursor-pointer ${isDragOver ? 'upload-area-dragover' : ''}`}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
            id={uploadId}
          />
          <label htmlFor={uploadId} className="cursor-pointer flex flex-col items-center">
            <Upload className="w-12 h-12 text-secondary-500 mb-md" />
            <p className="text-base text-neutral-900 text-center font-medium">{label}</p>
            <p className="description-text-gradient text-sm text-neutral-600 mt-sm">支持 JPEG, PNG, WebP 格式</p>
          </label>
        </div>
      )}
    </div>
  )
}
