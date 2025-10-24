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
    const { transaction_type, credits_amount, reason, user_id, balance_after } = await req.json();

    // 验证输入
    if (!transaction_type || !['add', 'deduct', 'refund'].includes(transaction_type)) {
      return new Response(
        JSON.stringify({ error: { message: '交易类型必须为 add、deduct 或 refund' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!credits_amount || credits_amount <= 0) {
      return new Response(
        JSON.stringify({ error: { message: '积分数量必须大于0' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return new Response(
        JSON.stringify({ error: { message: '必须提供交易原因' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: { message: '必须提供用户ID' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (balance_after === undefined || balance_after < 0) {
      return new Response(
        JSON.stringify({ error: { message: '必须提供有效的交易后余额' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    console.log('创建积分交易记录:', currentUser.id, '类型:', transaction_type, '数量:', credits_amount);

    // 验证用户权限 - 检查是否为管理员
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
    
    // 只有管理员可以创建非自己账户的交易记录
    if (user_id !== currentUser.id && adminData.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '没有权限为其他用户创建交易记录' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 创建积分交易记录
    const transactionData = {
      user_id: user_id,
      transaction_type: transaction_type,
      credits_amount: credits_amount,
      balance_after: balance_after,
      reason: reason,
      created_at: new Date().toISOString(),
      created_by: currentUser.id
    };

    const transactionResponse = await fetch(
      `${supabaseUrl}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      }
    );

    if (!transactionResponse.ok) {
      const errorText = await transactionResponse.text();
      throw new Error(`创建积分交易记录失败: ${errorText}`);
    }

    const newTransaction = await transactionResponse.json();
    console.log('积分交易记录创建成功:', newTransaction[0]?.id);

    return new Response(
      JSON.stringify({
        data: newTransaction[0],
        message: '积分交易记录创建成功',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('创建积分交易记录错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'CREATE_CREDIT_TRANSACTION_FAILED',
          message: error instanceof Error ? error.message : '创建积分交易记录失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});