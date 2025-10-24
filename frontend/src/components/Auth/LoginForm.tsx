import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { validateEmail, validateInput, SecurityLogger } from '../../lib/validation'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

export default function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({})
  
  // 输入框焦点状态
  const [focusedField, setFocusedField] = useState<string | null>(null)

  // 实时验证邮箱
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    
    if (value.trim() !== '') {
      const emailResult = validateEmail(value)
      setValidationErrors(prev => ({
        ...prev,
        email: emailResult.isValid ? undefined : emailResult.errors[0]
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, email: undefined }))
    }
  }

  // 实时验证密码
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    if (value.trim() !== '') {
      const passwordResult = validateInput(value, { minLength: 8, maxLength: 128 })
      setValidationErrors(prev => ({
        ...prev,
        password: passwordResult.isValid ? undefined : passwordResult.errors[0]
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 前端输入验证
    const emailResult = validateEmail(email)
    const passwordResult = validateInput(password, { minLength: 8, maxLength: 128 })
    
    const validationErrors: { email?: string; password?: string } = {}
    
    if (!emailResult.isValid) {
      validationErrors.email = emailResult.errors[0]
    }
    
    if (!passwordResult.isValid) {
      validationErrors.password = passwordResult.errors[0]
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors)
      setError('请检查输入格式')
      SecurityLogger.log('WARNING', '登录表单验证失败', { email, validationErrors })
      return
    }
    
    setLoading(true)

    try {
      // 使用清理后的输入
      const sanitizedEmail = emailResult.sanitized
      const sanitizedPassword = passwordResult.sanitized
      
      await signIn(sanitizedEmail, sanitizedPassword)
      SecurityLogger.log('INFO', '用户登录成功', { email: sanitizedEmail })
    } catch (err: any) {
      // 记录安全日志
      SecurityLogger.log('WARNING', '用户登录失败', { 
        email, 
        error: err.message,
        ip: window.location.hostname
      })
      
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
              onChange={handleEmailChange}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className={`auth-input ${focusedField === 'email' ? 'auth-input pl-12' : 'auth-input pl-12'} ${
                validationErrors.email ? 'border-red-500' : ''
              }`}
              placeholder="请输入邮箱"
              required
            />
            {validationErrors.email && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.email}</p>
            )}
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
              onChange={handlePasswordChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className={`auth-input ${focusedField === 'password' ? 'auth-input pl-12' : 'auth-input pl-12'} ${
                validationErrors.password ? 'border-red-500' : ''
              }`}
              placeholder="请输入密码"
              required
            />
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
            )}
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
