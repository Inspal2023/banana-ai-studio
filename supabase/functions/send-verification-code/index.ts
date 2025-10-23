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

    // 使用 Resend API 发送邮件
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY 未配置');
    }

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

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: '香蕉AI工作室 <onboarding@resend.dev>',
        to: [email],
        subject: '【香蕉AI工作室】邮箱验证码',
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend API 错误:', resendError);
      console.error('Resend API 状态码:', resendResponse.status);
      throw new Error(`邮件发送失败: ${resendResponse.status} - ${resendError}`);
    }

    const resendData = await resendResponse.json();
    console.log(`验证码已通过 Resend 发送到 ${email}，邮件ID: ${resendData.id}`);
    console.log(`验证码将在 ${expiresAt} 过期`);

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
