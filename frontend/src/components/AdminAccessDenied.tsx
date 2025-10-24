import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'

interface AdminAccessDeniedProps {
  title?: string
  message?: string
  showBackButton?: boolean
}

export default function AdminAccessDenied({ 
  title = "访问被拒绝",
  message = "您没有权限访问此页面",
  showBackButton = true 
}: AdminAccessDeniedProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="space-y-3">
          {showBackButton && (
            <button
              onClick={() => navigate(-1)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回上一页
            </button>
          )}
          
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            返回主页
          </button>
        </div>
      </div>
    </div>
  )
}