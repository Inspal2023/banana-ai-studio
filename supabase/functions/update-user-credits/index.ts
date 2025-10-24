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
    const { credits_to_deduct, reason } = await req.json();

    // 验证输入
    if (!credits_to_deduct || credits_to_deduct <= 0) {
      return new Response(
        JSON.stringify({ error: { message: '扣除积分数量必须大于0' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return new Response(
        JSON.stringify({ error: { message: '必须提供扣除原因' } }),
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

    const user = await userResponse.json();
    console.log('用户消耗积分:', user.id, '数量:', credits_to_deduct);

    // 获取当前用户积分
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
        JSON.stringify({ error: { message: '用户积分不足' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userCredits = credits[0];
    const currentRemaining = userCredits.remaining_credits;

    // 检查积分是否足够
    if (currentRemaining < credits_to_deduct) {
      return new Response(
        JSON.stringify({ 
          error: { 
            message: '积分不足',
            current_credits: currentRemaining,
            required_credits: credits_to_deduct
          } 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 更新用户积分
    const newRemaining = currentRemaining - credits_to_deduct;
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remaining_credits: newRemaining,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error('更新用户积分失败');
    }

    // 创建积分交易记录
    const transactionResponse = await fetch(
      `${supabaseUrl}/rest/v1/credit_transactions`,
      {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          transaction_type: 'deduct',
          credits_amount: credits_to_deduct,
          balance_after: newRemaining,
          reason: reason,
          created_at: new Date().toISOString(),
        }),
      }
    );

    if (!transactionResponse.ok) {
      console.warn('创建积分交易记录失败，但积分已扣除');
    }

    console.log('积分扣除成功:', user.id, '剩余积分:', newRemaining);

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          user_id: user.id,
          deducted_credits: credits_to_deduct,
          remaining_credits: newRemaining,
          reason: reason,
          transaction_time: new Date().toISOString(),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新用户积分错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'UPDATE_USER_CREDITS_FAILED',
          message: error instanceof Error ? error.message : '更新用户积分失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});