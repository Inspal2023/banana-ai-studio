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
        JSON.stringify({ error: { message: '未提供有效的授权令牌' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 验证管理员权限
    const verifyResponse = await fetch(`${supabaseUrl}/functions/v1/verify-admin`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!verifyResponse.ok) {
      throw new Error('验证管理员权限失败');
    }

    const verifyData = await verifyResponse.json();
    
    if (!verifyData.data?.is_admin) {
      return new Response(
        JSON.stringify({ error: { message: '没有管理员权限' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('获取用户列表和积分信息:', verifyData.data.user.id);

    // 获取查询参数
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search') || '';
    const minCredits = url.searchParams.get('min_credits');
    const maxCredits = url.searchParams.get('max_credits');

    // 构建查询URL - 获取用户积分信息
    let queryUrl = `${supabaseUrl}/rest/v1/user_credits?select=*,auth.users(email,created_at)&order=updated_at.desc&limit=${limit}&offset=${offset}`;
    
    // 添加搜索条件
    if (search) {
      // 搜索用户邮箱
      queryUrl += `&auth.users.email=ilike.*${search}*`;
    }
    
    // 添加积分范围过滤
    if (minCredits) {
      queryUrl += `&available_credits=gte.${minCredits}`;
    }
    if (maxCredits) {
      queryUrl += `&available_credits=lte.${maxCredits}`;
    }

    // 获取用户积分数据
    const usersResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!usersResponse.ok) {
      throw new Error('获取用户列表失败');
    }

    const users = await usersResponse.json();

    // 构建返回数据
    const usersWithCredits = users.map(user => ({
      id: user.user_id,
      email: user.auth?.users?.[0]?.email || '未知',
      total_credits: user.total_credits || 0,
      available_credits: user.available_credits || 0,
      created_at: user.auth?.users?.[0]?.created_at || user.created_at,
      updated_at: user.updated_at
    }));

    // 获取总数用于分页
    let countUrl = `${supabaseUrl}/rest/v1/user_credits?select=count`;
    
    if (search) {
      countUrl += `&auth.users.email=ilike.*${search}*`;
    }
    if (minCredits) {
      countUrl += `&available_credits=gte.${minCredits}`;
    }
    if (maxCredits) {
      countUrl += `&available_credits=lte.${maxCredits}`;
    }

    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    let totalCount = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      totalCount = countData[0]?.count || 0;
    }

    // 获取统计数据
    const statsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?select=available_credits`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let creditsStats = { total: 0, average: 0, min: 0, max: 0 };
    if (statsResponse.ok) {
      const allCredits = await statsResponse.json();
      const credits = allCredits.map(u => u.available_credits || 0);
      const total = credits.reduce((sum, c) => sum + c, 0);
      creditsStats = {
        total: total,
        average: credits.length > 0 ? Math.round(total / credits.length) : 0,
        min: credits.length > 0 ? Math.min(...credits) : 0,
        max: credits.length > 0 ? Math.max(...credits) : 0
      };
    }

    const responseData = {
      users: usersWithCredits,
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount,
        has_more: (offset + limit) < totalCount
      },
      stats: {
        credits: creditsStats,
        filtered_count: usersWithCredits.length
      },
      filters: {
        search: search || null,
        min_credits: minCredits ? parseInt(minCredits) : null,
        max_credits: maxCredits ? parseInt(maxCredits) : null
      }
    };

    console.log('用户列表查询成功:', usersWithCredits.length, '条记录，总计:', totalCount);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_USERS_WITH_CREDITS_FAILED',
          message: error instanceof Error ? error.message : '获取用户列表失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});