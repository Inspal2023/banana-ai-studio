import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  // 输入框焦点状态
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
    } catch (err: any) {
      // 将技术错误信息转换为友好提示
      let errorMessage = '登录失败，请稍后重试'
      
      if (err.message) {
        const msg = err.message.toLowerCase()
        if (msg.includes('invalid login credentials') || msg.includes('invalid') || msg.includes('credentials')) {
          errorMessage = '邮箱不存在或密码错误，请检查后重试'
        } else if (msg.includes('email not confirmed')) {
          errorMessage = '邮箱未验证，请先完成邮箱验证'
        } else if (msg.includes('too many requests')) {
          errorMessage = '登录尝试次数过多，请稍后再试'
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <img src="/images/logo.png" alt="香蕉AI工作室" className="auth-logo" />
      
      {/* 标题 */}
      <h2 className="text-3xl font-bold text-center mb-2 text-neutral-800">
        香蕉AI工作室
      </h2>
      <p className="text-center text-neutral-600 mb-8">欢迎回来！</p>

      {/* 错误提示 */}
      {error && (
        <div className="error-message mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 邮箱输入 */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            邮箱地址
          </label>
          <div className="relative">
            {focusedField !== 'email' && (
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className={focusedField === 'email' ? 'auth-input' : 'auth-input pl-12'}
              placeholder="请输入邮箱"
              required
            />
          </div>
        </div>

        {/* 密码输入 */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            密码
          </label>
          <div className="relative">
            {focusedField !== 'password' && (
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className={focusedField === 'password' ? 'auth-input' : 'auth-input pl-12'}
              placeholder="请输入密码"
              required
            />
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="auth-button-primary"
        >
          {loading ? '登录中...' : '登 录'}
        </button>
      </form>

      {/* 注册链接 */}
      <p className="text-center mt-6 text-neutral-600">
        还没有账号？
        <button 
          onClick={onSwitchToRegister}
          className="text-link ml-2"
        >
          立即注册
        </button>
      </p>
    </div>
  )
}
