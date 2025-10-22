import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import ImagePreview from './ImagePreview'
import { Loader2 } from 'lucide-react'

interface ImageState {
  file: File | null
  previewUrl: string
}

interface LineArtGeneratorProps {
  imageState: ImageState
  setImageState: (state: ImageState) => void
  isGenerating: boolean
  setIsGenerating: (value: boolean) => void
  resultUrl: string
  setResultUrl: (url: string) => void
}

export default function LineArtGenerator({ 
  imageState, 
  setImageState,
  isGenerating,
  setIsGenerating,
  resultUrl,
  setResultUrl
}: LineArtGeneratorProps) {
  const [lineArtType, setLineArtType] = useState<'technical' | 'concept'>('technical')
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

          const { data: lineArtData, error: lineArtError } = await supabase.functions.invoke('generate-line-art', {
            body: { imageUrl, lineArtType }
          })

          console.log('Edge Function 响应:', lineArtData)

          if (lineArtError) throw new Error(lineArtError.message)
          if (lineArtData?.error) throw new Error(lineArtData.error.message || lineArtData.error)

          // 多种格式兼容
          let generatedImageUrl = ''
          
          if (lineArtData?.data?.images?.[0]) {
            // 格式1: { data: { images: [url] } }
            generatedImageUrl = typeof lineArtData.data.images[0] === 'string' 
              ? lineArtData.data.images[0] 
              : lineArtData.data.images[0].url
          } else if (lineArtData?.images?.[0]) {
            // 格式2: { images: [url] }
            generatedImageUrl = typeof lineArtData.images[0] === 'string'
              ? lineArtData.images[0]
              : lineArtData.images[0].url
          } else if (lineArtData?.data?.url) {
            // 格式3: { data: { url: string } }
            generatedImageUrl = lineArtData.data.url
          } else if (lineArtData?.url) {
            // 格式4: { url: string }
            generatedImageUrl = lineArtData.url
          } else if (typeof lineArtData === 'string') {
            // 格式5: 直接返回 URL 字符串
            generatedImageUrl = lineArtData
          }

          if (generatedImageUrl) {
            console.log('设置结果 URL:', generatedImageUrl)
            setResultUrl(generatedImageUrl)
          } else {
            console.error('无法解析图片 URL，完整响应:', JSON.stringify(lineArtData, null, 2))
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
      a.download = `line-art-${Date.now()}.png`
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
              {/* 线稿类型选择 */}
              <div>
                <label className="section-title-decorated text-sm mb-md">选择线稿类型</label>
                <div className="flex gap-md">
                  <button
                    onClick={() => setLineArtType('technical')}
                    className={`flex-1 option-button ${
                      lineArtType === 'technical' ? 'option-selected' : 'option-unselected'
                    }`}
                  >
                    工程线稿
                  </button>
                  <button
                    onClick={() => setLineArtType('concept')}
                    className={`flex-1 option-button ${
                      lineArtType === 'concept' ? 'option-selected' : 'option-unselected'
                    }`}
                  >
                    概念线稿
                  </button>
                </div>
              </div>

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
              <p className="description-text-gradient text-neutral-600">生成的线稿图将显示在这里</p>
            </div>
          )}
        </div>
    </div>
  )
}
