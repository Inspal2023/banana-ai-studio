import { createHash, createHmac } from 'node:crypto';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: { message: '邮箱格式不正确' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 检查60秒内是否已发送验证码（防止滥用）
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/email_verification_codes?email=eq.${email}&created_at=gte.${new Date(Date.now() - 60000).toISOString()}&order=created_at.desc&limit=1`,
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
        email,
        code,
        expires_at: expiresAt,
        used: false,
      }),
    });

    if (!insertResponse.ok) {
      throw new Error('保存验证码失败');
    }

    // 使用腾讯云 SES API 发送邮件
    const secretId = Deno.env.get('TENCENT_SECRET_ID');
    const secretKey = Deno.env.get('TENCENT_SECRET_KEY');
    const fromEmail = Deno.env.get('TENCENT_FROM_EMAIL') || 'noreply@jishi.asia';

    if (!secretId || !secretKey) {
      throw new Error('腾讯云 API 密钥未配置');
    }

    // 构建邮件内容
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2e7d32;">香蕉AI工作室</h2>
        <p>您好！</p>
        <p>您的验证码是：</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2e7d32; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">验证码将在 5 分钟后失效，请尽快完成注册。</p>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">如果这不是您的操作，请忽略此邮件。</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">© 香蕉AI工作室</p>
      </div>
    `;

    // 调用腾讯云 SES API
    const result = await sendTencentCloudEmail(
      secretId,
      secretKey,
      fromEmail,
      email,
      '【香蕉AI工作室】邮箱验证码',
      emailHtml
    );

    console.log(`验证码已通过腾讯云 SES 发送到 ${email}`);
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
    console.error('发送验证码错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'SEND_CODE_FAILED',
          message: error instanceof Error ? error.message : '发送验证码失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * 腾讯云 SES API 发送邮件
 */
async function sendTencentCloudEmail(
  secretId: string,
  secretKey: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string
) {
  const service = 'ses';
  const host = 'ses.tencentcloudapi.com';
  const region = 'ap-guangzhou';
  const action = 'SendEmail';
  const version = '2020-10-02';
  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  // UTF-8 字符串转 base64
  const utf8ToBase64 = (str: string): string => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return btoa(String.fromCharCode(...data));
  };

  // 构建请求参数（腾讯云 SES 需要 base64 编码）
  const textBody = `您的验证码是：${extractCodeFromHtml(htmlBody)}。验证码将在 5 分钟后失效，请尽快完成注册。`;
  
  const payload = {
    FromEmailAddress: `香蕉AI工作室 <${from}>`,
    Destination: [to],
    Subject: subject,
    Simple: {
      Html: utf8ToBase64(htmlBody),
      Text: utf8ToBase64(textBody),
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

/**
 * 从 HTML 中提取验证码
 */
function extractCodeFromHtml(html: string): string {
  const match = html.match(/>\s*(\d{6})\s*</);  
  return match ? match[1] : '';
}
