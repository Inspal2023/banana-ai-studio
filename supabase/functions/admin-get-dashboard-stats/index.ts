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

    console.log('获取管理员仪表板统计数据:', verifyData.data.user.id);

    // 并行获取各种统计数据
    const [
      usersResponse,
      adminsResponse,
      transactionsResponse,
      rechargesResponse,
      todayTransactionsResponse,
      pendingRechargesResponse
    ] = await Promise.all([
      // 用户总数
      fetch(`${supabaseUrl}/rest/v1/user_credits?select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 管理员总数
      fetch(`${supabaseUrl}/rest/v1/admins?select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 交易记录总数
      fetch(`${supabaseUrl}/rest/v1/credit_transactions?select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 充值记录总数
      fetch(`${supabaseUrl}/rest/v1/recharge_records?select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 今日交易记录数
      fetch(`${supabaseUrl}/rest/v1/credit_transactions?created_at=gte.${new Date().toISOString().split('T')[0]}&select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 待处理充值数
      fetch(`${supabaseUrl}/rest/v1/recharge_records?status=eq.pending&select=count`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      })
    ]);

    // 获取总积分数量
    const totalCreditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?select=total_credits,available_credits`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!totalCreditsResponse.ok) {
      throw new Error('获取积分统计失败');
    }

    const usersCredits = await totalCreditsResponse.json();
    const totalCredits = usersCredits.reduce((sum, user) => sum + (user.total_credits || 0), 0);
    const totalAvailableCredits = usersCredits.reduce((sum, user) => sum + (user.available_credits || 0), 0);

    // 处理响应数据
    const usersCount = await usersResponse.json();
    const adminsCount = await adminsResponse.json();
    const transactionsCount = await transactionsResponse.json();
    const rechargesCount = await rechargesResponse.json();
    const todayTransactionsCount = await todayTransactionsResponse.json();
    const pendingRechargesCount = await pendingRechargesResponse.json();

    const stats = {
      users: {
        total: usersCount[0]?.count || 0,
        label: '总用户数'
      },
      admins: {
        total: adminsCount[0]?.count || 0,
        label: '管理员数'
      },
      transactions: {
        total: transactionsCount[0]?.count || 0,
        today: todayTransactionsCount[0]?.count || 0,
        label: '交易记录'
      },
      recharges: {
        total: rechargesCount[0]?.count || 0,
        pending: pendingRechargesCount[0]?.count || 0,
        label: '充值记录'
      },
      credits: {
        total: totalCredits,
        available: totalAvailableCredits,
        label: '积分统计'
      },
      generated_at: new Date().toISOString()
    };

    return new Response(
      JSON.stringify({ data: stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取管理员仪表板统计数据错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_DASHBOARD_STATS_FAILED',
          message: error instanceof Error ? error.message : '获取仪表板统计数据失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});