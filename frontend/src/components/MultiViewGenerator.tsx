import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import ImagePreview from './ImagePreview'
import { Loader2 } from 'lucide-react'

interface ImageState {
  file: File | null
  previewUrl: string
}

interface MultiViewGeneratorProps {
  imageState: ImageState
  setImageState: (state: ImageState) => void
  isGenerating: boolean
  setIsGenerating: (value: boolean) => void
  resultUrl: string
  setResultUrl: (url: string) => void
}

export default function MultiViewGenerator({ 
  imageState, 
  setImageState,
  isGenerating,
  setIsGenerating,
  resultUrl,
  setResultUrl
}: MultiViewGeneratorProps) {
  const [error, setError] = useState<string>('')

  const handleImageSelect = (file: File) => {
    setImageState({
      file,
      previewUrl: URL.createObjectURL(file)
    })
    setResultUrl('')
    setError('')
  }

  const handleImageRemove = () => {
    setImageState({ file: null, previewUrl: '' })
    setResultUrl('')
    setError('')
  }

  const handleGenerate = async () => {
    if (!imageState.file) return

    setIsGenerating(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.readAsDataURL(imageState.file)
      
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string

          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-image', {
            body: { imageData: base64Data, fileName: imageState.file!.name }
          })

          if (uploadError) throw new Error(uploadError.message)
          if (uploadData.error) throw new Error(uploadData.error.message)

          const imageUrl = uploadData.data.publicUrl

          const { data: multiViewData, error: multiViewError } = await supabase.functions.invoke('generate-multi-view', {
            body: { imageUrl }
          })

          console.log('Edge Function 响应:', multiViewData)

          if (multiViewError) throw new Error(multiViewError.message)
          if (multiViewData?.error) throw new Error(multiViewData.error.message || multiViewData.error)

          // 多种格式兼容
          let generatedImageUrl = ''
          
          if (multiViewData?.data?.images?.[0]) {
            generatedImageUrl = typeof multiViewData.data.images[0] === 'string' 
              ? multiViewData.data.images[0] 
              : multiViewData.data.images[0].url
          } else if (multiViewData?.images?.[0]) {
            generatedImageUrl = typeof multiViewData.images[0] === 'string'
              ? multiViewData.images[0]
              : multiViewData.images[0].url
          } else if (multiViewData?.data?.url) {
            generatedImageUrl = multiViewData.data.url
          } else if (multiViewData?.url) {
            generatedImageUrl = multiViewData.url
          } else if (typeof multiViewData === 'string') {
            generatedImageUrl = multiViewData
          }

          if (generatedImageUrl) {
            console.log('设置结果 URL:', generatedImageUrl)
            setResultUrl(generatedImageUrl)
          } else {
            console.error('无法解析图片 URL，完整响应:', JSON.stringify(multiViewData, null, 2))
            throw new Error('生成失败，未返回图片')
          }
        } catch (err: any) {
          setError(err.message || '生成失败，请重试')
        } finally {
          setIsGenerating(false)
        }
      }

      reader.onerror = () => {
        setError('文件读取失败，请重试')
        setIsGenerating(false)
      }
    } catch (err: any) {
      setError(err.message || '生成失败，请重试')
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (resultUrl) {
      const a = document.createElement('a')
      a.href = resultUrl
      a.download = `multi-view-${Date.now()}.png`
      a.click()
    }
  }

  return (
    <div className="flex gap-xxxl">
      {/* 左侧操作区 */}
      <div className="card-elevated w-[480px] flex-shrink-0 p-xxl">
          <h2 className="section-title-decorated text-xl mb-xl">上传图片</h2>

          <ImageUpload 
            onImageSelect={handleImageSelect}
            onImageRemove={handleImageRemove}
            previewUrl={imageState.previewUrl}
          />

          {imageState.previewUrl && (
            <div className="space-y-xl mt-xl">
              {/* 生成按钮 */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-primary flex items-center justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    <span className="button-text-enhanced">生成中...</span>
                  </>
                ) : (
                  <span className="button-text-enhanced">开始生成</span>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-xl p-lg bg-semantic-error/10 border-2 border-semantic-error rounded-md text-semantic-error text-sm">
              {error}
            </div>
          )}
        </div>

      {/* 右侧结果区 */}
      <div className="card-result w-[520px] flex-shrink-0 p-xxl">
          <h2 className="section-title-decorated text-xl mb-xl">生成结果</h2>

          {isGenerating ? (
            <div className="h-[360px] bg-neutral-50 rounded-md flex flex-col items-center justify-center">
              <div className="image-skeleton w-full h-full rounded-md"></div>
            </div>
          ) : resultUrl ? (
            <div className="result-fade-in">
              <ImagePreview imageUrl={resultUrl} onDownload={handleDownload} />
            </div>
          ) : (
            <div className="h-[360px] bg-neutral-50 rounded-md flex items-center justify-center">
              <p className="description-text-gradient text-neutral-600">生成的三视图将显示在这里</p>
            </div>
          )}
        </div>
    </div>
  )
}
