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

    console.log('更新管理员设置:', verifyData.data.user.id);

    // 获取请求数据
    const requestData = await req.json();
    const {
      wechat_qr_code_url,
      contact_email,
      contact_phone,
      system_settings,
      auto_approve_recharges,
      recharge_approval_threshold
    } = requestData;

    // 验证输入数据
    if (!requestData || typeof requestData !== 'object') {
      return new Response(
        JSON.stringify({ error: { message: '无效的请求数据' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否为超级管理员（只有超级管理员可以修改系统设置）
    let isSuperAdmin = false;
    const adminCheckResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?user_id=eq.${verifyData.data.user.id}&admin_level=eq.3`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (adminCheckResponse.ok) {
      const adminData = await adminCheckResponse.json();
      isSuperAdmin = adminData.length > 0;
    }

    // 如果要修改系统设置但不是超级管理员，拒绝请求
    if ((system_settings || auto_approve_recharges !== undefined || recharge_approval_threshold !== undefined) && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: { message: '只有超级管理员可以修改系统设置' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 获取当前管理员记录
    const currentAdminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?user_id=eq.${verifyData.data.user.id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!currentAdminResponse.ok) {
      throw new Error('获取当前管理员信息失败');
    }

    const currentAdmin = await currentAdminResponse.json();
    
    if (currentAdmin.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '管理员记录不存在' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminRecord = currentAdmin[0];

    // 构建更新数据
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // 只更新提供的字段
    if (wechat_qr_code_url !== undefined) {
      updateData.wechat_qr_code_url = wechat_qr_code_url;
    }

    // 如果是超级管理员，可以更新系统设置
    if (isSuperAdmin) {
      // 这里可以添加系统设置更新逻辑
      // 由于我们没有专门的系统设置表，这里只是记录在管理员记录中
      if (contact_email !== undefined) {
        updateData.contact_email = contact_email;
      }
      if (contact_phone !== undefined) {
        updateData.contact_phone = contact_phone;
      }
      if (system_settings !== undefined) {
        updateData.system_settings = system_settings;
      }
      if (auto_approve_recharges !== undefined) {
        updateData.auto_approve_recharges = auto_approve_recharges;
      }
      if (recharge_approval_threshold !== undefined) {
        updateData.recharge_approval_threshold = parseInt(recharge_approval_threshold);
      }
    }

    // 更新管理员记录
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?user_id=eq.${verifyData.data.user.id}`,
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
      throw new Error('更新管理员设置失败');
    }

    // 获取更新后的记录
    const updatedAdminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?user_id=eq.${verifyData.data.user.id}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!updatedAdminResponse.ok) {
      throw new Error('获取更新后的管理员信息失败');
    }

    const updatedAdmin = await updatedAdminResponse.json();

    const responseData = {
      message: '管理员设置更新成功',
      admin: {
        id: updatedAdmin[0].id,
        user_id: updatedAdmin[0].user_id,
        admin_level: updatedAdmin[0].admin_level,
        admin_level_name: getAdminLevelName(updatedAdmin[0].admin_level),
        wechat_qr_code_url: updatedAdmin[0].wechat_qr_code_url,
        contact_email: updatedAdmin[0].contact_email,
        contact_phone: updatedAdmin[0].contact_phone,
        updated_at: updatedAdmin[0].updated_at
      },
      is_super_admin: isSuperAdmin,
      updated_fields: Object.keys(updateData).filter(key => key !== 'updated_at')
    };

    console.log('管理员设置更新成功:', verifyData.data.user.id, '更新的字段:', responseData.updated_fields);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('更新管理员设置错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'UPDATE_ADMIN_SETTINGS_FAILED',
          message: error instanceof Error ? error.message : '更新管理员设置失败',
        },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 管理员级别映射函数
function getAdminLevelName(level) {
  switch (level) {
    case 1:
      return '普通管理员';
    case 2:
      return '高级管理员';
    case 3:
      return '超级管理员';
    default:
      return '未知级别';
  }
}