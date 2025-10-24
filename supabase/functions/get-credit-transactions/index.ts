Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 获取查询参数
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const transaction_type = url.searchParams.get('transaction_type');
    const user_id = url.searchParams.get('user_id'); // 可选，用于管理员查看其他用户记录

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

    const currentUser = await userResponse.json();
    console.log('获取积分交易记录:', currentUser.id, '用户ID:', user_id);

    let targetUserId = user_id || currentUser.id;

    // 如果请求查看其他用户的记录，验证管理员权限
    if (user_id && user_id !== currentUser.id) {
      const adminCheckResponse = await fetch(
        `${supabaseUrl}/rest/v1/admin_users?user_id=eq.${currentUser.id}`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (!adminCheckResponse.ok) {
        throw new Error('验证管理员权限失败');
      }

      const adminData = await adminCheckResponse.json();
      
      if (adminData.length === 0) {
        return new Response(
          JSON.stringify({ error: { message: '没有权限查看其他用户的交易记录' } }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('管理员查看用户积分记录:', currentUser.id, '查看:', targetUserId);
    }

    // 构建查询条件
    let queryUrl = `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${targetUserId}&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (transaction_type) {
      queryUrl += `&transaction_type=eq.${transaction_type}`;
    }

    // 获取积分交易记录
    const transactionsResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!transactionsResponse.ok) {
      throw new Error('获取积分交易记录失败');
    }

    const transactions = await transactionsResponse.json();

    // 获取总数量（用于分页）
    let countUrl = `${supabaseUrl}/rest/v1/credit_transactions?user_id=eq.${targetUserId}&select=count`;
    
    if (transaction_type) {
      countUrl += `&transaction_type=eq.${transaction_type}`;
    }

    const countResponse = await fetch(countUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (countResponse.ok) {
      const countData = await countResponse.json();
      console.log('积分交易记录查询成功:', transactions.length, '条记录，总计:', countData[0]?.count || 0);
    }

    return new Response(
      JSON.stringify({
        data: {
          transactions: transactions,
          pagination: {
            limit: limit,
            offset: offset,
            total: countData[0]?.count || 0,
            has_more: (offset + limit) < (countData[0]?.count || 0)
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取积分交易记录错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_CREDIT_TRANSACTIONS_FAILED',
          message: error instanceof Error ? error.message : '获取积分交易记录失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});