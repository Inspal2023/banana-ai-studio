Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
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

    console.log('更新充值记录状态:', verifyData.data.user.id);

    // 获取请求数据
    const requestData = await req.json();
    const { recharge_id, status, notes } = requestData;

    // 验证输入数据
    if (!recharge_id || !status) {
      return new Response(
        JSON.stringify({ error: { message: '缺少必要参数：recharge_id 和 status' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 验证状态值
    const validStatuses = ['pending', 'completed', 'rejected', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: { message: '无效的状态值' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取充值记录
    const rechargeResponse = await fetch(
      `${supabaseUrl}/rest/v1/recharge_records?id=eq.${recharge_id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!rechargeResponse.ok) {
      throw new Error('获取充值记录失败');
    }

    const rechargeData = await rechargeResponse.json();
    
    if (rechargeData.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '充值记录不存在' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recharge = rechargeData[0];

    // 如果状态已经是最终状态，拒绝修改（防止重复操作）
    if (recharge.status === 'completed' || recharge.status === 'rejected' || recharge.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: { message: `充值记录状态已是最终状态：${getStatusName(recharge.status)}，不能修改` } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 如果要设置为已完成，需要检查用户积分记录是否存在
    if (status === 'completed') {
      const userCreditsResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_credits?user_id=eq.${recharge.user_id}`,
        {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
        }
      );

      if (userCreditsResponse.ok) {
        const userCredits = await userCreditsResponse.json();
        if (userCredits.length === 0) {
          // 如果用户积分记录不存在，创建默认记录
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
                user_id: recharge.user_id,
                total_credits: 0,
                available_credits: 0,
              }),
            }
          );

          if (!createResponse.ok) {
            console.warn('创建用户积分记录失败，但继续处理充值记录');
          }
        }
      }
    }

    // 开始事务处理：更新充值记录和可能的积分操作
    const updateData = {
      status: status,
      notes: notes || recharge.notes,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 如果设置了admin_id但为空，则设置为当前管理员
    if (!recharge.admin_id) {
      updateData.admin_id = verifyData.data.user.id;
    }

    // 更新充值记录
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/recharge_records?id=eq.${recharge_id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!updateResponse.ok) {
      throw new Error('更新充值记录失败');
    }

    // 如果状态是已完成，调用积分更新函数
    let creditUpdateResult = null;
    if (status === 'completed') {
      try {
        const creditUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/update_user_credits`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_user_id: recharge.user_id,
            p_amount: recharge.credits_amount,
            p_transaction_type: 'recharge',
            p_description: `管理员充值 - 充值记录ID: ${recharge_id}`
          }),
        });

        if (creditUpdateResponse.ok) {
          creditUpdateResult = await creditUpdateResponse.json();
          console.log('积分更新成功:', creditUpdateResult);
        } else {
          console.warn('积分更新失败，但充值记录已更新');
        }
      } catch (error) {
        console.warn('积分更新异常:', error);
      }
    }

    // 获取更新后的记录
    const updatedRechargeResponse = await fetch(
      `${supabaseUrl}/rest/v1/recharge_records?id=eq.${recharge_id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!updatedRechargeResponse.ok) {
      throw new Error('获取更新后的充值记录失败');
    }

    const updatedRecharge = await updatedRechargeResponse.json();

    const responseData = {
      message: '充值记录状态更新成功',
      recharge: {
        id: updatedRecharge[0].id,
        user_id: updatedRecharge[0].user_id,
        admin_id: updatedRecharge[0].admin_id,
        credits_amount: updatedRecharge[0].credits_amount,
        status: updatedRecharge[0].status,
        status_name: getStatusName(updatedRecharge[0].status),
        notes: updatedRecharge[0].notes,
        processed_at: updatedRecharge[0].processed_at,
        updated_at: updatedRecharge[0].updated_at
      },
      credit_update: creditUpdateResult,
      updated_by: verifyData.data.user.id,
      updated_at: new Date().toISOString()
    };

    console.log('充值记录状态更新成功:', recharge_id, '新状态:', status, '管理员:', verifyData.data.user.id);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新充值记录状态错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'UPDATE_RECHARGE_STATUS_FAILED',
          message: error instanceof Error ? error.message : '更新充值记录状态失败',
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