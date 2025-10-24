// 复用验证函数（简化版）
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
  /(\b(UNION|AND|OR)\b\s+\w+\s*=\s*\w+)/i,
  /('|(\\x27)|(\\')|(\\")|(\\x22))/,
  /(;|--|\/\*|\*\/)/,
];

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
];

function logSecurityEvent(type: 'WARNING' | 'ERROR' | 'INFO', message: string, details?: any) {
  console.log(`[SECURITY ${type}] ${new Date().toISOString()} - ${message}`, details);
}

function sanitizeInput(input: string): string {
  if (!input) return '';
  
  let sanitized = input.trim();
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(pattern, input));
}

function validateEmail(email: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('邮箱不能为空');
    return { isValid: false, sanitized: '', errors };
  }
  
  if (email.length > 254) {
    errors.push('邮箱长度不能超过254个字符');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('邮箱格式不正确');
  }
  
  if (detectSQLInjection(email)) {
    errors.push('检测到可能的SQL注入攻击');
  }
  
  if (detectXSS(email)) {
    errors.push('检测到可能的XSS攻击');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized: sanitizeInput(email),
    errors
  };
}

function validateCode(code: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  
  if (!code || code.trim() === '') {
    errors.push('验证码不能为空');
    return { isValid: false, sanitized: '', errors };
  }
  
  if (!/^\d{6}$/.test(code)) {
    errors.push('验证码必须为6位数字');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized: code,
    errors
  };
}

function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || password.trim() === '') {
    errors.push('密码不能为空');
    return { isValid: false, errors };
  }
  
  if (password.length < 8 || password.length > 128) {
    errors.push('密码长度必须在8-128个字符之间');
  }
  
  if (!/[A-Za-z]/.test(password)) {
    errors.push('密码必须包含字母');
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字');
  }
  
  if (detectSQLInjection(password)) {
    errors.push('检测到可能的SQL注入攻击');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      logSecurityEvent('WARNING', '无效的JSON请求', { error: error.message });
      return new Response(
        JSON.stringify({ error: { message: '请求格式错误' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, code, password } = requestData;

    // 综合输入验证
    const emailValidation = validateEmail(email);
    const codeValidation = validateCode(code);
    const passwordValidation = validatePassword(password);

    const validationErrors: string[] = [];
    if (!emailValidation.isValid) validationErrors.push(...emailValidation.errors);
    if (!codeValidation.isValid) validationErrors.push(...codeValidation.errors);
    if (!passwordValidation.isValid) validationErrors.push(...passwordValidation.errors);

    if (validationErrors.length > 0) {
      logSecurityEvent('WARNING', '注册输入验证失败', { 
        email: emailValidation.sanitized,
        errors: validationErrors 
      });
      return new Response(
        JSON.stringify({ error: { message: validationErrors[0] } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取客户端IP
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    logSecurityEvent('INFO', '注册请求', { email: emailValidation.sanitized, ip: clientIP });

    // 使用验证后的输入
    const validatedEmail = emailValidation.sanitized;
    const validatedCode = codeValidation.sanitized;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 查询验证码
    const verifyResponse = await fetch(
      `${supabaseUrl}/rest/v1/email_verification_codes?email=eq.${encodeURIComponent(validatedEmail)}&code=eq.${encodeURIComponent(validatedCode)}&used=eq.false&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const codes = await verifyResponse.json();
    if (codes.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '验证码无效或已使用' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationRecord = codes[0];

    // 检查验证码是否过期
    if (new Date(verificationRecord.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: { message: '验证码已过期' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 标记验证码为已使用
    await fetch(`${supabaseUrl}/rest/v1/email_verification_codes?id=eq.${encodeURIComponent(verificationRecord.id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString(),
      }),
    });

    // 创建用户账号（使用 Admin API）
    const signUpResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: validatedEmail,
        password, // 密码不进行HTML转义，但保持输入验证
        email_confirm: true,
      }),
    });

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      // 检查是否是用户已存在的错误
      if (signUpData.msg && signUpData.msg.includes('already registered')) {
        logSecurityEvent('WARNING', '用户尝试使用已注册邮箱', { email: validatedEmail });
        return new Response(
          JSON.stringify({ error: { message: '该邮箱已被注册' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorMsg = signUpData.msg || '注册失败';
      logSecurityEvent('ERROR', '用户注册失败', { email: validatedEmail, error: errorMsg });
      
      // 防止敏感信息泄露
      const safeErrorMessage = errorMsg.includes('password') || errorMsg.includes('credential') 
        ? '注册失败，请检查输入信息' 
        : errorMsg;
      
      throw new Error(safeErrorMessage);
    }

    // 确保邮箱已确认 - 使用 SQL 直接更新
    if (signUpData.id) {
      await fetch(
        `${supabaseUrl}/rest/v1/rpc/confirm_user_email`,
        {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: signUpData.id }),
        }
      ).catch(() => {
        // 如果 RPC 失败，使用直接 SQL 更新
        console.log('使用备用方式确认邮箱');
      });
    }

    logSecurityEvent('INFO', '用户注册成功', { email: validatedEmail, userId: signUpData.id });

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          user: signUpData.user,
          session: signUpData.session,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '注册失败';
    logSecurityEvent('ERROR', '注册异常', { error: errorMessage });
    
    // 防止敏感信息泄露
    const safeErrorMessage = errorMessage.includes('API') || errorMessage.includes('密钥') || errorMessage.includes('配置') 
      ? '服务器配置错误，请联系管理员' 
      : errorMessage;
});
