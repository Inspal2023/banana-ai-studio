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
    const { target_user_id, credits_amount, reason } = await req.json();

    // 验证输入
    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: { message: '必须提供目标用户ID' } }),
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
        JSON.stringify({ error: { message: '必须提供添加原因' } }),
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

    // 验证管理员权限
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
        JSON.stringify({ error: { message: '只有管理员可以为用户添加积分' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('管理员添加用户积分:', currentUser.id, '目标用户:', target_user_id, '数量:', credits_amount);

    // 验证目标用户是否存在
    const targetUserResponse = await fetch(
      `${supabaseUrl}/rest/v1/auth.users?id=eq.${target_user_id}&select=id,email`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!targetUserResponse.ok) {
      throw new Error('验证目标用户失败');
    }

    const targetUsers = await targetUserResponse.json();
    if (targetUsers.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '目标用户不存在' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUser = targetUsers[0];

    // 获取目标用户当前积分
    const creditsResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${target_user_id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!creditsResponse.ok) {
      throw new Error('获取目标用户积分信息失败');
    }

    const credits = await creditsResponse.json();
    let currentTotalCredits = 0;
    let currentRemainingCredits = 0;

    if (credits.length > 0) {
      currentTotalCredits = credits[0].total_credits;
      currentRemainingCredits = credits[0].remaining_credits;
    }

    const newTotalCredits = currentTotalCredits + credits_amount;
    const newRemainingCredits = currentRemainingCredits + credits_amount;

    // 更新用户积分
    if (credits.length > 0) {
      // 更新现有记录
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${target_user_id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            total_credits: newTotalCredits,
            remaining_credits: newRemainingCredits,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('更新用户积分失败');
      }
    } else {
      // 创建新记录
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
            user_id: target_user_id,
            total_credits: newTotalCredits,
            remaining_credits: newRemainingCredits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error('创建用户积分记录失败');
      }
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
          user_id: target_user_id,
          transaction_type: 'add',
          credits_amount: credits_amount,
          balance_after: newRemainingCredits,
          reason: reason,
          created_at: new Date().toISOString(),
          created_by: currentUser.id,
        }),
      }
    );

    if (!transactionResponse.ok) {
      console.warn('创建积分交易记录失败，但积分已添加');
    }

    console.log('为用户添加积分成功:', target_user_id, '新总积分:', newTotalCredits, '新剩余积分:', newRemainingCredits);

    return new Response(
      JSON.stringify({
        data: {
          success: true,
          target_user: {
            id: targetUser.id,
            email: targetUser.email,
          },
          admin_user: {
            id: currentUser.id,
          },
          added_credits: credits_amount,
          new_total_credits: newTotalCredits,
          new_remaining_credits: newRemainingCredits,
          reason: reason,
          transaction_time: new Date().toISOString(),
        },
        message: '为用户添加积分成功',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('为用户添加积分错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'ADD_CREDITS_FOR_USER_FAILED',
          message: error instanceof Error ? error.message : '为用户添加积分失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});