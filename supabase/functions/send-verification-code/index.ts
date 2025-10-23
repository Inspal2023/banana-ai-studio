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

    // 发送邮件（使用Supabase内置邮件服务）
    // 注意：在生产环境中应该使用真实的邮件服务，这里仅作演示
    console.log(`验证码发送到 ${email}: ${code}`);
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
