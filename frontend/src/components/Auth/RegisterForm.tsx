import { useState } from 'react'
import { Mail, Lock, Hash } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

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

  // 发送验证码
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('send-verification-code', {
        body: { email }
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error.message)
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
    } catch (err: any) {
      setError(err.message || '发送验证码失败')
    } finally {
      setLoading(false)
    }
  }

  // 完成注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码
    if (password !== confirmPassword) {
      setError('两次密码输入不一致')
      return
    }

    if (password.length < 8) {
      setError('密码长度不能少于8位')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('register-with-code', {
        body: { email, code, password }
      })

      if (error) throw error

      if (data?.error) {
        throw new Error(data.error.message)
      }

      // 注册成功，设置session
      if (data?.data?.session) {
        await supabase.auth.setSession(data.data.session)
      }
    } catch (err: any) {
      setError(err.message || '注册失败')
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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input pl-12"
                placeholder="请输入邮箱"
                required
              />
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
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="auth-input pl-12"
              placeholder="请输入验证码"
              maxLength={6}
              required
            />
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
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input pl-12"
              placeholder="至少8位，包含字母和数字"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            确认密码
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="auth-input pl-12"
              placeholder="再次输入密码"
              required
            />
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
