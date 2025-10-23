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
      email,
      '【香蕉AI工作室】邮箱验证码',
      templateId,
      { code }
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


