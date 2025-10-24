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
    // 验证授权头
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: { message: '未提供有效的授权令牌' } }),
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
        JSON.stringify({ error: { message: '无效的授权令牌' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = await userResponse.json();
    console.log('获取用户积分信息:', user.id);

    // 获取用户积分信息
    const creditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${user.id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!creditsResponse.ok) {
      throw new Error('获取用户积分信息失败');
    }

    const credits = await creditsResponse.json();
    
    // 如果用户积分记录不存在，创建默认记录
    if (credits.length === 0) {
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_credits`,
        {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            total_credits: 0,
            remaining_credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error('创建用户积分记录失败');
      }

      return new Response(
        JSON.stringify({
          data: {
            user_id: user.id,
            total_credits: 0,
            remaining_credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userCredits = credits[0];

    return new Response(
      JSON.stringify({
        data: userCredits,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取用户积分信息错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_USER_CREDITS_FAILED',
          message: error instanceof Error ? error.message : '获取用户积分信息失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});