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

    console.log('获取交易记录和用户信息:', verifyData.data.user.id);

    // 获取查询参数
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const transaction_type = url.searchParams.get('transaction_type');
    const user_search = url.searchParams.get('user_search') || '';
    const date_from = url.searchParams.get('date_from');
    const date_to = url.searchParams.get('date_to');

    // 构建查询URL
    let queryUrl = `${supabaseUrl}/rest/v1/credit_transactions?select=*,auth.users(email)&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    // 添加筛选条件
    if (transaction_type) {
      queryUrl += `&transaction_type=eq.${transaction_type}`;
    }
    
    if (date_from) {
      queryUrl += `&created_at=gte.${date_from}`;
    }
    
    if (date_to) {
      queryUrl += `&created_at=lte.${date_to}`;
    }
    
    if (user_search) {
      queryUrl += `&auth.users.email=ilike.*${user_search}*`;
    }

    // 获取交易记录
    const transactionsResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!transactionsResponse.ok) {
      throw new Error('获取交易记录失败');
    }

    const transactions = await transactionsResponse.json();

    // 构建返回数据，包含用户信息
    const transactionsWithUsers = transactions.map(transaction => ({
      id: transaction.id,
      user_id: transaction.user_id,
      user_email: transaction.auth?.users?.[0]?.email || '未知用户',
      transaction_type: transaction.transaction_type,
      amount: transaction.amount,
      balance_after: transaction.balance_after,
      description: transaction.description,
      created_at: transaction.created_at
    }));

    // 构建总数查询URL
    let countUrl = `${supabaseUrl}/rest/v1/credit_transactions?select=count`;
    
    if (transaction_type) {
      countUrl += `&transaction_type=eq.${transaction_type}`;
    }
    if (date_from) {
      countUrl += `&created_at=gte.${date_from}`;
    }
    if (date_to) {
      countUrl += `&created_at=lte.${date_to}`;
    }
    if (user_search) {
      countUrl += `&auth.users.email=ilike.*${user_search}*`;
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

    // 获取交易类型统计
    const statsResponse = await fetch(
      `${supabaseUrl}/rest/v1/credit_transactions?select=transaction_type,amount`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let typeStats = {};
    if (statsResponse.ok) {
      const allTransactions = await statsResponse.json();
      const stats = {};
      
      allTransactions.forEach(t => {
        const type = t.transaction_type;
        if (!stats[type]) {
          stats[type] = { count: 0, total_amount: 0 };
        }
        stats[type].count++;
        stats[type].total_amount += Math.abs(t.amount);
      });
      
      typeStats = stats;
    }

    const responseData = {
      transactions: transactionsWithUsers,
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount,
        has_more: (offset + limit) < totalCount
      },
      stats: {
        type_breakdown: typeStats,
        filtered_count: transactionsWithUsers.length
      },
      filters: {
        transaction_type: transaction_type || null,
        user_search: user_search || null,
        date_from: date_from || null,
        date_to: date_to || null
      }
    };

    console.log('交易记录查询成功:', transactionsWithUsers.length, '条记录，总计:', totalCount);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取交易记录错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_TRANSACTIONS_WITH_USERS_FAILED',
          message: error instanceof Error ? error.message : '获取交易记录失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});