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

    console.log('获取充值记录列表:', verifyData.data.user.id);

    // 获取查询参数
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status'); // pending, completed, rejected, cancelled
    const user_search = url.searchParams.get('user_search') || '';
    const min_amount = url.searchParams.get('min_amount');
    const max_amount = url.searchParams.get('max_amount');
    const date_from = url.searchParams.get('date_from');
    const date_to = url.searchParams.get('date_to');

    // 构建查询URL
    let queryUrl = `${supabaseUrl}/rest/v1/recharge_records?select=*,auth.users(email),admin_user:auth.users!recharge_records_admin_id_fkey(email)&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    // 添加筛选条件
    if (status) {
      queryUrl += `&status=eq.${status}`;
    }
    
    if (user_search) {
      queryUrl += `&auth.users.email=ilike.*${user_search}*`;
    }
    
    if (min_amount) {
      queryUrl += `&credits_amount=gte.${min_amount}`;
    }
    
    if (max_amount) {
      queryUrl += `&credits_amount=lte.${max_amount}`;
    }
    
    if (date_from) {
      queryUrl += `&created_at=gte.${date_from}`;
    }
    
    if (date_to) {
      queryUrl += `&created_at=lte.${date_to}`;
    }

    // 获取充值记录
    const rechargesResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!rechargesResponse.ok) {
      throw new Error('获取充值记录失败');
    }

    const recharges = await rechargesResponse.json();

    // 构建返回数据，包含用户和管理员信息
    const rechargesWithInfo = recharges.map(recharge => ({
      id: recharge.id,
      user_id: recharge.user_id,
      user_email: recharge.auth?.users?.[0]?.email || '未知用户',
      admin_id: recharge.admin_id,
      admin_email: recharge.admin_user?.[0]?.email || null,
      credits_amount: recharge.credits_amount,
      status: recharge.status,
      status_name: getStatusName(recharge.status),
      notes: recharge.notes,
      created_at: recharge.created_at,
      processed_at: recharge.processed_at
    }));

    // 构建总数查询URL
    let countUrl = `${supabaseUrl}/rest/v1/recharge_records?select=count`;
    
    if (status) {
      countUrl += `&status=eq.${status}`;
    }
    if (user_search) {
      countUrl += `&auth.users.email=ilike.*${user_search}*`;
    }
    if (min_amount) {
      countUrl += `&credits_amount=gte.${min_amount}`;
    }
    if (max_amount) {
      countUrl += `&credits_amount=lte.${max_amount}`;
    }
    if (date_from) {
      countUrl += `&created_at=gte.${date_from}`;
    }
    if (date_to) {
      countUrl += `&created_at=lte.${date_to}`;
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

    // 获取状态统计
    const statusStatsResponse = await fetch(
      `${supabaseUrl}/rest/v1/recharge_records?select=status,credits_amount`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let statusStats = {};
    let totalAmount = 0;
    if (statusStatsResponse.ok) {
      const allRecharges = await statusStatsResponse.json();
      const stats = {};
      
      allRecharges.forEach(recharge => {
        const status = recharge.status;
        if (!stats[status]) {
          stats[status] = { 
            name: getStatusName(status),
            count: 0, 
            total_amount: 0 
          };
        }
        stats[status].count++;
        stats[status].total_amount += recharge.credits_amount || 0;
      });
      
      statusStats = stats;
      totalAmount = allRecharges.reduce((sum, r) => sum + (r.credits_amount || 0), 0);
    }

    const responseData = {
      recharges: rechargesWithInfo,
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount,
        has_more: (offset + limit) < totalCount
      },
      stats: {
        status_breakdown: statusStats,
        total_amount: totalAmount,
        filtered_count: rechargesWithInfo.length,
        pending_count: statusStats.pending?.count || 0
      },
      filters: {
        status: status || null,
        user_search: user_search || null,
        min_amount: min_amount ? parseInt(min_amount) : null,
        max_amount: max_amount ? parseInt(max_amount) : null,
        date_from: date_from || null,
        date_to: date_to || null
      }
    };

    console.log('充值记录查询成功:', rechargesWithInfo.length, '条记录，总计:', totalCount);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取充值记录错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_RECHARGE_RECORDS_FAILED',
          message: error instanceof Error ? error.message : '获取充值记录失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 状态映射函数
function getStatusName(status) {
  switch (status) {
    case 'pending':
      return '待处理';
    case 'completed':
      return '已完成';
    case 'rejected':
      return '已拒绝';
    case 'cancelled':
      return '已取消';
    default:
      return '未知状态';
  }
}