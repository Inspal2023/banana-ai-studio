Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 验证授权头
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ 
          error: { message: '未提供有效的授权令牌' },
          data: { is_admin: false }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 验证用户令牌
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: { message: '无效的授权令牌' },
          data: { is_admin: false }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await userResponse.json();
    console.log('验证管理员权限:', user.id);

    // 检查用户是否为管理员
    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${user.id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!adminResponse.ok) {
      throw new Error('验证管理员权限失败');
    }

    const adminData = await adminResponse.json();
    const isAdmin = adminData.length > 0;

    let adminInfo = null;
    if (isAdmin) {
      adminInfo = adminData[0];
      console.log('用户是管理员:', user.id, '角色:', adminInfo.role);
    } else {
      console.log('用户不是管理员:', user.id);
    }

    return new Response(
      JSON.stringify({
        data: {
          is_admin: isAdmin,
          user: {
            id: user.id,
            email: user.email,
          },
          admin_info: adminInfo,
          verified_at: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('验证管理员权限错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'VERIFY_ADMIN_FAILED',
          message: error instanceof Error ? error.message : '验证管理员权限失败',
        },
        data: { is_admin: false }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});