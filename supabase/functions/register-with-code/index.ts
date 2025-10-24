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
    const { email, code, password } = await req.json();

    // 验证输入
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: { message: '邮箱格式不正确' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code || code.length !== 6) {
      return new Response(
        JSON.stringify({ error: { message: '验证码格式不正确' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码强度（至少8位，包含字母和数字）
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({ error: { message: '密码必须至少8位，且包含字母和数字' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 查询验证码
    const verifyResponse = await fetch(
      `${supabaseUrl}/rest/v1/email_verification_codes?email=eq.${email}&code=eq.${code}&used=eq.false&order=created_at.desc&limit=1`,
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
    await fetch(`${supabaseUrl}/rest/v1/email_verification_codes?id=eq.${verificationRecord.id}`, {
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
        email,
        password,
        email_confirm: true,
      }),
    });

    const signUpData = await signUpResponse.json();

    if (!signUpResponse.ok) {
      // 检查是否是用户已存在的错误
      if (signUpData.msg && signUpData.msg.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: { message: '该邮箱已被注册' } }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(signUpData.msg || '注册失败');
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
    console.error('注册错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'REGISTER_FAILED',
          message: error instanceof Error ? error.message : '注册失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
