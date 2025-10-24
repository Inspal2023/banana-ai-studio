import { createClient } from '@supabase/supabase-js'

// 从环境变量获取 Supabase 配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 验证必要的环境变量
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// 开发环境下的额外验证
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl.substring(0, 30) + '...')
  console.log('Environment:', import.meta.env.DEV ? 'development' : 'production')
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 自动刷新会话
    autoRefreshToken: true,
    // 在浏览器标签页之间持久化会话
    persistSession: true,
    // 检测会话是否从其他标签页更改
    detectSessionInUrl: true
  },
  // 全局配置
  global: {
    headers: {
      'x-application-name': 'banana-ai-studio'
    }
  }
})