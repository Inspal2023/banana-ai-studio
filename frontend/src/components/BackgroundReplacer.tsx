import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ImageUpload from './ImageUpload'
import ImagePreview from './ImagePreview'
import { Loader2, Sparkles, MessageSquare, Image as ImageIcon, Layers } from 'lucide-react'

type Mode = 'text' | 'image' | 'hybrid'

interface ImageState {
  file: File | null
  previewUrl: string
}

interface BackgroundReplacerProps {
  subjectImage: ImageState
  setSubjectImage: (state: ImageState) => void
  backgroundImage: ImageState
  setBackgroundImage: (state: ImageState) => void
  isGenerating: boolean
  setIsGenerating: (value: boolean) => void
  resultUrl: string
  setResultUrl: (url: string) => void
}

export default function BackgroundReplacer({ 
  subjectImage, 
  setSubjectImage,
  backgroundImage,
  setBackgroundImage,
  isGenerating,
  setIsGenerating,
  resultUrl,
  setResultUrl
}: BackgroundReplacerProps) {
  const [mode, setMode] = useState<Mode>('text')
  const [textPrompt, setTextPrompt] = useState<string>('')
  const [textPromptEn, setTextPromptEn] = useState<string>('')
  const [optimizing, setOptimizing] = useState(false)
  const [error, setError] = useState<string>('')

  const handleImageSelect = (file: File) => {
    setSubjectImage({
      file,
      previewUrl: URL.createObjectURL(file)
    })
    setResultUrl('')
    setError('')
  }

  const handleBackgroundSelect = (file: File) => {
    setBackgroundImage({
      file,
      previewUrl: URL.createObjectURL(file)
    })
    setResultUrl('')
    setError('')
  }

  const handleImageRemove = () => {
    setSubjectImage({ file: null, previewUrl: '' })
    setResultUrl('')
    setError('')
  }

  const handleBackgroundRemove = () => {
    setBackgroundImage({ file: null, previewUrl: '' })
    setResultUrl('')
    setError('')
  }

  const handleOptimizePrompt = async () => {
    if (!textPrompt.trim()) return

    setOptimizing(true)
    try {
      const { data, error: optimizeError } = await supabase.functions.invoke('optimize-prompt', {
        body: { userPrompt: textPrompt }
      })

      if (optimizeError) throw new Error(optimizeError.message)
      if (data.error) throw new Error(data.error.message)

      if (data.data) {
        if (data.data.optimizedPromptCn) {
          setTextPrompt(data.data.optimizedPromptCn)
        }
        if (data.data.optimizedPromptEn) {
          setTextPromptEn(data.data.optimizedPromptEn)
        } else if (data.data.optimizedPrompt) {
          setTextPromptEn(data.data.optimizedPrompt)
        }
      }
    } catch (err: any) {
      setError(err.message || '优化失败')
    } finally {
      setOptimizing(false)
    }
  }

  const handleGenerate = async () => {
    if (!subjectImage.file) return
    if (mode === 'text' && !textPrompt.trim()) {
      setError('请输入背景描述')
      return
    }
    if ((mode === 'image' || mode === 'hybrid') && !backgroundImage.file) {
      setError('请上传背景图片')
      return
    }
    if (mode === 'hybrid' && !textPrompt.trim()) {
      setError('请输入修改描述')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.readAsDataURL(subjectImage.file)
      
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string

          const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-image', {
            body: { imageData: base64Data, fileName: subjectImage.file!.name }
          })

          if (uploadError) throw new Error(uploadError.message)
          if (uploadData.error) throw new Error(uploadData.error.message)

          const imageUrl = uploadData.data.publicUrl
          let backgroundUrl = ''

          if (mode === 'image' || mode === 'hybrid') {
            if (!backgroundImage.file) throw new Error('缺少背景图片')
            
            const bgReader = new FileReader()
            bgReader.readAsDataURL(backgroundImage.file)
            
            await new Promise((resolve, reject) => {
              bgReader.onloadend = async () => {
                try {
                  const bgBase64Data = bgReader.result as string
                  const { data: bgUploadData, error: bgUploadError } = await supabase.functions.invoke('upload-image', {
                    body: { imageData: bgBase64Data, fileName: backgroundImage.file!.name }
                  })

                  if (bgUploadError) throw new Error(bgUploadError.message)
                  if (bgUploadData.error) throw new Error(bgUploadData.error.message)

                  backgroundUrl = bgUploadData.data.publicUrl
                  resolve(true)
                } catch (err) {
                  reject(err)
                }
              }
              bgReader.onerror = reject
            })
          }

          const { data: replaceData, error: replaceError } = await supabase.functions.invoke('replace-background', {
            body: {
              imageUrl,
              mode,
              textPrompt: textPromptEn || textPrompt || undefined,
              backgroundUrl: backgroundUrl || undefined
            }
          })

          console.log('Edge Function 响应:', replaceData)

          if (replaceError) throw new Error(replaceError.message)
          if (replaceData?.error) throw new Error(replaceData.error.message || replaceData.error)

          // 多种格式兼容
          let generatedImageUrl = ''
          
          if (replaceData?.data?.images?.[0]) {
            generatedImageUrl = typeof replaceData.data.images[0] === 'string' 
              ? replaceData.data.images[0] 
              : replaceData.data.images[0].url
          } else if (replaceData?.images?.[0]) {
            generatedImageUrl = typeof replaceData.images[0] === 'string'
              ? replaceData.images[0]
              : replaceData.images[0].url
          } else if (replaceData?.data?.url) {
            generatedImageUrl = replaceData.data.url
          } else if (replaceData?.url) {
            generatedImageUrl = replaceData.url
          } else if (typeof replaceData === 'string') {
            generatedImageUrl = replaceData
          }

          if (generatedImageUrl) {
            console.log('设置结果 URL:', generatedImageUrl)
            setResultUrl(generatedImageUrl)
          } else {
            console.error('无法解析图片 URL，完整响应:', JSON.stringify(replaceData, null, 2))
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
      a.download = `background-replaced-${Date.now()}.png`
      a.click()
    }
  }

  return (
    <div className="flex gap-xxxl">
      {/* 左侧操作区 */}
      <div className="card-elevated w-[480px] flex-shrink-0 p-xxl">
          <h2 className="section-title-decorated text-xl mb-xl">上传图片</h2>

          {/* 模式选择 */}
          <div className="mb-xl">
            <label className="section-title-decorated text-sm mb-md">选择模式</label>
            <div className="grid grid-cols-3 gap-md">
              <button
                onClick={() => setMode('text')}
                className={`option-button ${mode === 'text' ? 'option-selected' : 'option-unselected'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  文字描述
                </span>
              </button>
              <button
                onClick={() => setMode('image')}
                className={`option-button ${mode === 'image' ? 'option-selected' : 'option-unselected'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  上传图片
                </span>
              </button>
              <button
                onClick={() => setMode('hybrid')}
                className={`option-button ${mode === 'hybrid' ? 'option-selected' : 'option-unselected'}`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Layers className="w-4 h-4" />
                  混合模式
                </span>
              </button>
            </div>
          </div>

          {/* 主体图片 */}
          <div className="mb-xl">
            <label className="section-title-decorated text-sm mb-md">主体图片</label>
            <ImageUpload 
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              previewUrl={subjectImage.previewUrl}
              label="上传主体图片" 
            />
          </div>

          {subjectImage.previewUrl && (
            <div className="space-y-xl">
              {/* 背景图片（图片模式/混合模式） */}
              {(mode === 'image' || mode === 'hybrid') && (
                <div>
                  <label className="section-title-decorated text-sm mb-md">背景图片</label>
                  <ImageUpload 
                    onImageSelect={handleBackgroundSelect}
                    onImageRemove={handleBackgroundRemove}
                    previewUrl={backgroundImage.previewUrl}
                    label="上传背景图片" 
                  />
                </div>
              )}

              {/* 文本描述（文字模式/混合模式） */}
              {(mode === 'text' || mode === 'hybrid') && (
                <div>
                  <label className="section-title-decorated text-sm mb-md">
                    {mode === 'hybrid' ? '修改描述' : '背景描述'}
                  </label>
                  <div className="relative">
                    <textarea
                      value={textPrompt}
                      onChange={(e) => setTextPrompt(e.target.value)}
                      placeholder="例如：现代简约客厅，温暖的自然光线，木地板背景"
                      className="input-elevated w-full h-24 px-lg py-md pb-12 text-neutral-900 placeholder-neutral-600 resize-none"
                    />
                    <button
                      onClick={handleOptimizePrompt}
                      disabled={optimizing || isGenerating || !textPrompt.trim()}
                      className="absolute bottom-2 right-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-md hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 text-sm hover:scale-105 shadow-md"
                    >
                      {optimizing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span className="font-medium">{optimizing ? '优化中' : '优化'}</span>
                    </button>
                  </div>
                </div>
              )}

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
              <p className="description-text-gradient text-neutral-600">更换后的图片将显示在这里</p>
            </div>
          )}
        </div>
    </div>
  )
}
