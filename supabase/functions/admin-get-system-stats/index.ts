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

    console.log('获取系统统计数据:', verifyData.data.user.id);

    // 获取查询参数
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const granularity = url.searchParams.get('granularity') || 'day'; // hour, day, week, month

    // 计算日期范围
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = startDate.toISOString();

    // 并行获取各种统计数据
    const [
      usersResponse,
      transactionsResponse,
      rechargesResponse,
      creditsResponse,
      todayUsersResponse,
      todayTransactionsResponse,
      todayRechargesResponse
    ] = await Promise.all([
      // 用户总数和近期注册用户
      fetch(`${supabaseUrl}/rest/v1/user_credits?select=count,created_at&created_at=gte.${startDateStr}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 交易记录统计
      fetch(`${supabaseUrl}/rest/v1/credit_transactions?select=transaction_type,amount,created_at&created_at=gte.${startDateStr}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 充值记录统计
      fetch(`${supabaseUrl}/rest/v1/recharge_records?select=status,credits_amount,created_at&created_at=gte.${startDateStr}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 积分统计
      fetch(`${supabaseUrl}/rest/v1/user_credits?select=total_credits,available_credits`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 今日新用户
      fetch(`${supabaseUrl}/rest/v1/user_credits?select=count&created_at=gte.${new Date().toISOString().split('T')[0]}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 今日交易
      fetch(`${supabaseUrl}/rest/v1/credit_transactions?select=count&created_at=gte.${new Date().toISOString().split('T')[0]}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }),
      // 今日充值
      fetch(`${supabaseUrl}/rest/v1/recharge_records?select=count&created_at=gte.${new Date().toISOString().split('T')[0]}`, {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      })
    ]);

    // 处理用户数据
    const usersData = await usersResponse.json();
    const totalUsers = usersData.filter(u => u.created_at).length;
    const newUsersInPeriod = usersData.filter(u => new Date(u.created_at) >= startDate).length;

    // 处理交易数据
    const transactionsData = await transactionsResponse.json();
    const transactionsStats = processTransactionsData(transactionsData, granularity);

    // 处理充值数据
    const rechargesData = await rechargesResponse.json();
    const rechargesStats = processRechargesData(rechargesData, granularity);

    // 处理积分数据
    const creditsData = await creditsResponse.json();
    const totalCredits = creditsData.reduce((sum, user) => sum + (user.total_credits || 0), 0);
    const totalAvailableCredits = creditsData.reduce((sum, user) => sum + (user.available_credits || 0), 0);

    // 处理今日数据
    const todayUsersCount = (await todayUsersResponse.json())[0]?.count || 0;
    const todayTransactionsCount = (await todayTransactionsResponse.json())[0]?.count || 0;
    const todayRechargesCount = (await todayRechargesResponse.json())[0]?.count || 0;

    // 获取管理员统计
    const adminsResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?select=admin_level`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let adminStats = {};
    if (adminsResponse.ok) {
      const adminsData = await adminsResponse.json();
      adminStats = {
        total: adminsData.length,
        level_1: adminsData.filter(a => a.admin_level === 1).length,
        level_2: adminsData.filter(a => a.admin_level === 2).length,
        level_3: adminsData.filter(a => a.admin_level === 3).length
      };
    }

    // 获取系统运行时间（从第一个用户注册开始）
    const firstUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?select=created_at&order=created_at.asc&limit=1`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let systemUptime = null;
    if (firstUserResponse.ok) {
      const firstUser = await firstUserResponse.json();
      if (firstUser.length > 0) {
        const firstUserDate = new Date(firstUser[0].created_at);
        const uptimeMs = now.getTime() - firstUserDate.getTime();
        systemUptime = {
          days: Math.floor(uptimeMs / (1000 * 60 * 60 * 24)),
          hours: Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        };
      }
    }

    const stats = {
      overview: {
        total_users: totalUsers,
        new_users_period: newUsersInPeriod,
        total_transactions: transactionsData.length,
        total_recharges: rechargesData.length,
        total_credits: totalCredits,
        total_available_credits: totalAvailableCredits,
        today_users: todayUsersCount,
        today_transactions: todayTransactionsCount,
        today_recharges: todayRechargesCount
      },
      period: {
        label: getPeriodLabel(period),
        start_date: startDateStr,
        end_date: now.toISOString(),
        granularity: granularity
      },
      trends: {
        transactions: transactionsStats,
        recharges: rechargesStats
      },
      admins: adminStats,
      system: {
        uptime: systemUptime,
        last_updated: now.toISOString()
      }
    };

    console.log('系统统计数据生成成功:', period, '期间数据');

    return new Response(
      JSON.stringify({ data: stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取系统统计数据错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_SYSTEM_STATS_FAILED',
          message: error instanceof Error ? error.message : '获取系统统计数据失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 处理交易数据，按时间粒度统计
function processTransactionsData(transactionsData, granularity) {
  const grouped = {};
  
  transactionsData.forEach(transaction => {
    const date = new Date(transaction.created_at);
    const key = getTimeKey(date, granularity);
    
    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        count: 0,
        total_amount: 0,
        types: {}
      };
    }
    
    grouped[key].count++;
    grouped[key].total_amount += Math.abs(transaction.amount);
    
    const type = transaction.transaction_type;
    if (!grouped[key].types[type]) {
      grouped[key].types[type] = { count: 0, amount: 0 };
    }
    grouped[key].types[type].count++;
    grouped[key].types[type].amount += Math.abs(transaction.amount);
  });
  
  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// 处理充值数据，按时间粒度统计
function processRechargesData(rechargesData, granularity) {
  const grouped = {};
  
  rechargesData.forEach(recharge => {
    const date = new Date(recharge.created_at);
    const key = getTimeKey(date, granularity);
    
    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        count: 0,
        total_amount: 0,
        status_breakdown: {}
      };
    }
    
    grouped[key].count++;
    grouped[key].total_amount += recharge.credits_amount || 0;
    
    const status = recharge.status;
    if (!grouped[key].status_breakdown[status]) {
      grouped[key].status_breakdown[status] = { count: 0, amount: 0 };
    }
    grouped[key].status_breakdown[status].count++;
    grouped[key].status_breakdown[status].amount += recharge.credits_amount || 0;
  });
  
  return Object.values(grouped).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// 获取时间粒度的键
function getTimeKey(date, granularity) {
  switch (granularity) {
    case 'hour':
      return date.toISOString().slice(0, 13) + ':00:00';
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().slice(0, 10);
    case 'month':
      return date.toISOString().slice(0, 7) + '-01';
    default:
      return date.toISOString().slice(0, 10);
  }
}

// 获取周期标签
function getPeriodLabel(period) {
  switch (period) {
    case '7d':
      return '最近7天';
    case '30d':
      return '最近30天';
    case '90d':
      return '最近90天';
    case '1y':
      return '最近1年';
    default:
      return '最近30天';
  }
}