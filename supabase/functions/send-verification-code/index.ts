import { createHash, createHmac } from 'node:crypto';

// SQL注入检测模式
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
  /(\b(UNION|AND|OR)\b\s+\w+\s*=\s*\w+)/i,
  /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR)\b)/i,
  /('|(\\x27)|(\\')|(\\")|(\\x22))/,
  /(;|--|\/\*|\*\/)/,
  /(\b(OR|AND)\b\s+['"]?1['"]?=['"]?1)/i,
];

// XSS检测模式
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<link[^>]*>/gi,
  /<style[^>]*>.*?<\/style>/gi,
  /<img[^>]*src[^>]*javascript:/gi,
  /on\w+\s*=/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
];

// 安全日志记录
function logSecurityEvent(type: 'WARNING' | 'ERROR' | 'INFO', message: string, details?: any) {
  console.log(`[SECURITY ${type}] ${new Date().toISOString()} - ${message}`, details);
}

// 输入清理函数
function sanitizeInput(input: string): string {
  if (!input) return '';
  
  let sanitized = input.trim();
  
  // 移除控制字符
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // 转义特殊字符
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized;
}

// 检测SQL注入
function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

// 检测XSS
function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

// 验证邮箱格式
function validateEmail(email: string): { isValid: boolean; sanitized: string; errors: string[] } {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('邮箱不能为空');
    return { isValid: false, sanitized: '', errors };
  }
  
  // 长度检查
  if (email.length > 254) {
    errors.push('邮箱长度不能超过254个字符');
  }
  
  // 格式检查
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('邮箱格式不正确');
  }
  
  // SQL注入检测
  if (detectSQLInjection(email)) {
    errors.push('检测到可能的SQL注入攻击');
  }
  
  // XSS检测
  if (detectXSS(email)) {
    errors.push('检测到可能的XSS攻击');
  }
  
  // 清理输入
  const sanitized = sanitizeInput(email);
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

// 频率限制检查
const requestHistory = new Map<string, number[]>();

function checkRateLimit(identifier: string, maxAttempts: number = 5, timeWindow: number = 60000): boolean {
  const now = Date.now();
  const attempts = requestHistory.get(identifier) || [];
  
  // 清理过期记录
  const recentAttempts = attempts.filter(time => now - time < timeWindow);
  
  if (recentAttempts.length >= maxAttempts) {
    logSecurityEvent('WARNING', '触发频率限制', { identifier, attempts: recentAttempts.length });
    return false;
  }
  
  // 记录当前尝试
  recentAttempts.push(now);
  requestHistory.set(identifier, recentAttempts);
  
  return true;
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

    const { email } = requestData;

    // 安全验证输入
    const emailValidation = validateEmail(email);
    
    if (!emailValidation.isValid) {
      logSecurityEvent('WARNING', '邮箱验证失败', { email, errors: emailValidation.errors });
      return new Response(
        JSON.stringify({ error: { message: emailValidation.errors[0] } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取客户端IP进行频率限制
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: { message: '请求过于频繁，请稍后再试' } }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用验证后的邮箱
    const validatedEmail = emailValidation.sanitized;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 检查邮箱是否已注册
    const checkUserResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const usersData = await checkUserResponse.json();
    const existingUser = usersData.users?.find((user: any) => user.email === validatedEmail);
    
    if (existingUser) {
      return new Response(
        JSON.stringify({ error: { message: '该邮箱已注册，请直接登录' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查60秒内是否已发送验证码（防止滥用）
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/email_verification_codes?email=eq.${encodeURIComponent(validatedEmail)}&created_at=gte.${new Date(Date.now() - 60000).toISOString()}&order=created_at.desc&limit=1`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const recentCodes = await checkResponse.json();
    if (recentCodes.length > 0) {
      return new Response(
        JSON.stringify({ error: { message: '请等待60秒后再重新发送' } }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 保存验证码到数据库（5分钟有效期）
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/email_verification_codes`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        email: validatedEmail,
        code,
        expires_at: expiresAt,
        used: false,
      }),
    });

    if (!insertResponse.ok) {
      throw new Error('保存验证码失败');
    }

    // 使用腾讯云 SES API 发送邮件（模板方式）
    const secretId = Deno.env.get('TENCENT_SECRET_ID');
    const secretKey = Deno.env.get('TENCENT_SECRET_KEY');
    const fromEmail = Deno.env.get('TENCENT_FROM_EMAIL') || 'noreply@jishi.asia';
    const templateId = Deno.env.get('TENCENT_EMAIL_TEMPLATE_ID');

    if (!secretId || !secretKey) {
      throw new Error('腾讯云 API 密钥未配置');
    }

    if (!templateId) {
      throw new Error('腾讯云邮件模板ID未配置');
    }

    // 调用腾讯云 SES API（使用模板）
    const result = await sendTencentCloudEmailWithTemplate(
      secretId,
      secretKey,
      fromEmail,
      validatedEmail,
      '【香蕉AI工作室】邮箱验证码',
      templateId,
      { code }
    );

    console.log(`验证码已通过腾讯云 SES 发送到 ${validatedEmail}`);
    logSecurityEvent('INFO', '验证码发送成功', { email: validatedEmail });
    console.log(`RequestId: ${result.RequestId}`);

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          message: '验证码已发送到您的邮箱',
          expiresIn: 300,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '发送验证码失败';
    logSecurityEvent('ERROR', '发送验证码错误', { error: errorMessage });
    
    // 防止敏感信息泄露
    const safeErrorMessage = errorMessage.includes('API') || errorMessage.includes('密钥') || errorMessage.includes('配置') 
      ? '服务器配置错误，请联系管理员' 
      : errorMessage;
});

/**
 * 腾讯云 SES API 发送邮件（使用模板）
 */
async function sendTencentCloudEmailWithTemplate(
  secretId: string,
  secretKey: string,
  from: string,
  to: string,
  subject: string,
  templateId: string,
  templateData: Record<string, string>
) {
  const service = 'ses';
  const host = 'ses.tencentcloudapi.com';
  const region = 'ap-guangzhou';
  const action = 'SendEmail';
  const version = '2020-10-02';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  // 构建请求参数（使用模板）
  const payload = {
    FromEmailAddress: `香蕉AI工作室 <${from}>`,
    Destination: [to],
    Subject: subject,
    Template: {
      TemplateID: parseInt(templateId),
      TemplateData: JSON.stringify(templateData),
    },
    ReplyToAddresses: from,
  };

  const payloadString = JSON.stringify(payload);

  // 步骤 1：拼接规范请求串
  const httpRequestMethod = 'POST';
  const canonicalUri = '/';
  const canonicalQueryString = '';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = createHash('sha256').update(payloadString).digest('hex');
  const canonicalRequest = `${httpRequestMethod}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${hashedRequestPayload}`;

  // 步骤 2：拼接待签名字符串
  const algorithm = 'TC3-HMAC-SHA256';
  const hashedCanonicalRequest = createHash('sha256').update(canonicalRequest).digest('hex');
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${hashedCanonicalRequest}`;

  // 步骤 3：计算签名
  const secretDate = createHmac('sha256', `TC3${secretKey}`).update(date).digest();
  const secretService = createHmac('sha256', secretDate).update(service).digest();
  const secretSigning = createHmac('sha256', secretService).update('tc3_request').digest();
  const signature = createHmac('sha256', secretSigning).update(stringToSign).digest('hex');

  // 步骤 4：拼接 Authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // 发送请求
  const response = await fetch(`https://${host}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Region': region,
      'Authorization': authorization,
    },
    body: payloadString,
  });

  const result = await response.json();

  if (!response.ok || result.Response?.Error) {
    const errorMsg = result.Response?.Error?.Message || '腾讯云 SES API 调用失败';
    console.error('腾讯云 SES 错误:', result);
    throw new Error(errorMsg);
  }

  return result.Response;
}


