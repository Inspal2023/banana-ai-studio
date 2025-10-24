import { useState } from 'react'
import { Mail, Lock, Hash } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { 
  validateEmail, 
  validateInput, 
  validateVerificationCode, 
  validatePassword,
  sanitizeInput,
  SecurityLogger 
} from '../../lib/validation'

// 从环境变量获取 Supabase 配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证必要的环境变量
if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL environment variable')
}

if (!SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

export default function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    code?: string;
    password?: string;
    confirmPassword?: string;
  }>({})
  
  // 输入框焦点状态
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  // 密码强度验证状态
  const [passwordValidation, setPasswordValidation] = useState({
    hasLetter: false,
    hasNumber: false,
    isLongEnough: false,
  })

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

  // 实时验证验证码
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    
    if (value.trim() !== '') {
      const codeResult = validateVerificationCode(value)
      setValidationErrors(prev => ({
        ...prev,
        code: codeResult.isValid ? undefined : codeResult.errors[0]
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, code: undefined }))
    }
  }

  // 实时验证密码
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    
    // 密码强度验证
    const passwordValidation = {
      hasLetter: /[A-Za-z]/.test(value),
      hasNumber: /\d/.test(value),
      isLongEnough: value.length >= 8,
    }
    setPasswordValidation(passwordValidation)
    
    if (value.trim() !== '') {
      const passwordResult = validatePassword(value)
      setValidationErrors(prev => ({
        ...prev,
        password: passwordResult.isValid ? undefined : (passwordResult.errors[0] || '密码格式不正确')
      }))
    } else {
      setValidationErrors(prev => ({ ...prev, password: undefined }))
    }
  }

  // 实时验证确认密码
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmPassword(value)
    
    if (value.trim() !== '') {
      if (password !== value) {
        setValidationErrors(prev => ({
          ...prev,
          confirmPassword: '两次密码输入不一致'
        }))
      } else {
        setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
    } else {
      setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
    }
  }

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证邮箱格式
    const emailResult = validateEmail(email)
    if (!emailResult.isValid) {
      setValidationErrors({ email: emailResult.errors[0] })
      SecurityLogger.log('WARNING', '注册邮箱验证失败', { email, errors: emailResult.errors })
      return
    }

    setLoading(true)

    try {
      // 使用清理后的邮箱
      const sanitizedEmail = emailResult.sanitized
      
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/send-verification-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ email: sanitizedEmail }),
        }
      )

      const data = await response.json()

      // 处理错误响应
      if (!response.ok) {
        const errorMsg = data?.error?.message || data?.message || '发送验证码失败'
        SecurityLogger.log('WARNING', '发送验证码失败', { email: sanitizedEmail, error: errorMsg })
        throw new Error(errorMsg)
      }

      // 设置60秒倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      // 进入第二步
      setStep(2)
      SecurityLogger.log('INFO', '验证码发送成功', { email: sanitizedEmail })
    } catch (err: any) {
      const errorMsg = err.message || '发送验证码失败'
      setError(errorMsg)
      SecurityLogger.log('ERROR', '发送验证码异常', { email, error: errorMsg })
    } finally {
      setLoading(false)
    }
  }



  // 完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 综合验证
    const emailResult = validateEmail(email)
    const codeResult = validateVerificationCode(code)
    const passwordResult = validatePassword(password)
    const passwordValidation = {
      hasLetter: /[A-Za-z]/.test(password),
      hasNumber: /\d/.test(password),
      isLongEnough: password.length >= 8,
    }

    const validationErrors: { email?: string; code?: string; password?: string; confirmPassword?: string } = {}

    if (!emailResult.isValid) {
      validationErrors.email = emailResult.errors[0]
    }

    if (!codeResult.isValid) {
      validationErrors.code = codeResult.errors[0]
    }

    if (!passwordResult.isValid) {
      validationErrors.password = passwordResult.errors[0] || '密码必须至少8位，且包含字母和数字'
    }

    if (password !== confirmPassword) {
      validationErrors.confirmPassword = '两次密码输入不一致'
    }

    if (Object.keys(validationErrors).length > 0) {
      setValidationErrors(validationErrors)
      setError('请检查输入格式')
      SecurityLogger.log('WARNING', '注册表单验证失败', { email, validationErrors })
      return
    }

    setLoading(true)

    try {
      // 使用清理后的输入
      const sanitizedEmail = emailResult.sanitized
      const sanitizedCode = codeResult.sanitized
      const sanitizedPassword = sanitizeInput(password) // 只清理，不修改密码内容

      const { data, error } = await supabase.functions.invoke('register-with-code', {
        body: { email: sanitizedEmail, code: sanitizedCode, password: sanitizedPassword }
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error.message)
      }

      // 注册成功，设置session并跳转到登录页
      if (data?.data?.session) {
        await supabase.auth.setSession(data.data.session)
      }
      
      SecurityLogger.log('INFO', '用户注册成功', { email: sanitizedEmail })
      
      // 注册成功后自动跳转到登录页
      setTimeout(() => {
        onSwitchToLogin()
      }, 500)
    } catch (err: any) {
      const errorMsg = err.message || '注册失败'
      setError(errorMsg)
      SecurityLogger.log('ERROR', '用户注册失败', { email, error: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  // 第一步：发送验证码
  if (step === 1) {
    return (
      <div className="auth-card">
        <img src="/images/logo.png" alt="香蕉AI工作室" className="auth-logo" />
        
        <h2 className="text-3xl font-bold text-center mb-2 text-neutral-800">
          创建账号
        </h2>
        <p className="text-center text-neutral-600 mb-8">开始你的AI创作之旅</p>

        {error && (
          <div className="error-message mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSendCode} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading || countdown > 0}
            className="auth-button-secondary"
          >
            {countdown > 0 ? `${countdown}秒后可重新发送` : loading ? '发送中...' : '发送验证码'}
          </button>
        </form>

        <p className="text-center mt-6 text-neutral-600">
          已有账号？
          <button 
            onClick={onSwitchToLogin}
            className="text-link ml-2"
          >
            立即登录
          </button>
        </p>
      </div>
    )
  }

  // 第二步：验证码 + 设置密码
  return (
    <div className="auth-card">
      <img src="/images/logo.png" alt="香蕉AI工作室" className="auth-logo" />
      
      <h2 className="text-3xl font-bold text-center mb-2 text-neutral-800">
        创建账号
      </h2>
      <p className="text-center text-neutral-600 mb-2">验证码已发送至：</p>
      <p className="text-center text-green-600 font-semibold mb-8">{email}</p>

      {error && (
        <div className="error-message mb-4">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            验证码（6位数字）
          </label>
          <div className="relative">
            {focusedField !== 'code' && (
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            )}
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              onFocus={() => setFocusedField('code')}
              onBlur={() => setFocusedField(null)}
              className={`auth-input ${focusedField === 'code' ? 'auth-input pl-12' : 'auth-input pl-12'} ${
                validationErrors.code ? 'border-red-500' : ''
              }`}
              placeholder="请输入验证码"
              maxLength={6}
              required
            />
            {validationErrors.code && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.code}</p>
            )}
          </div>
          {countdown > 0 && (
            <p className="text-sm text-neutral-500 mt-2">
              {countdown}秒后可重新发送
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            设置密码
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
              placeholder="至少8位，包含字母和数字"
              required
            />
            {validationErrors.password && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.password}</p>
            )}
          </div>
          {password && (
            <div className="space-y-1 text-xs">
              <div className={passwordValidation.isLongEnough ? 'text-green-600' : 'text-neutral-500'}>
                {passwordValidation.isLongEnough ? '✓' : '○'} 至少8位字符
              </div>
              <div className={passwordValidation.hasLetter ? 'text-green-600' : 'text-neutral-500'}>
                {passwordValidation.hasLetter ? '✓' : '○'} 包含字母
              </div>
              <div className={passwordValidation.hasNumber ? 'text-green-600' : 'text-neutral-500'}>
                {passwordValidation.hasNumber ? '✓' : '○'} 包含数字
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            确认密码
          </label>
          <div className="relative">
            {focusedField !== 'confirmPassword' && (
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            )}
            <input
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              className={`auth-input ${focusedField === 'confirmPassword' ? 'auth-input pl-12' : 'auth-input pl-12'} ${
                validationErrors.confirmPassword ? 'border-red-500' : ''
              }`}
              placeholder="再次输入密码"
              required
            />
            {validationErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="auth-button-primary"
        >
          {loading ? '注册中...' : '完成注册'}
        </button>
      </form>

      <p className="text-center mt-6 text-neutral-600">
        <button 
          onClick={() => setStep(1)}
          className="text-link"
        >
          返回上一步
        </button>
      </p>
    </div>
  )
}
