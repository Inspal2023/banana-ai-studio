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
    console.log('验证超级管理员权限:', user.id);

    // 验证是否为超级管理员（admin_level = 3）
    const adminResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?user_id=eq.${user.id}&admin_level=eq.3`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!adminResponse.ok) {
      throw new Error('验证超级管理员权限失败');
    }

    const adminData = await adminResponse.json();
    
    if (adminData.length === 0) {
      return new Response(
        JSON.stringify({ error: { message: '没有超级管理员权限' } }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('超级管理员查看管理员列表:', user.id);

    // 获取查询参数
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const admin_level = url.searchParams.get('admin_level');
    const search = url.searchParams.get('search') || '';

    // 构建查询URL
    let queryUrl = `${supabaseUrl}/rest/v1/admins?select=*,auth.users(email,created_at)&order=created_at.desc&limit=${limit}&offset=${offset}`;
    
    if (admin_level) {
      queryUrl += `&admin_level=eq.${admin_level}`;
    }
    
    if (search) {
      queryUrl += `&auth.users.email=ilike.*${search}*`;
    }

    // 获取管理员列表
    const adminsResponse = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
    });

    if (!adminsResponse.ok) {
      throw new Error('获取管理员列表失败');
    }

    const admins = await adminsResponse.json();

    // 构建返回数据
    const adminsWithInfo = admins.map(admin => ({
      id: admin.id,
      user_id: admin.user_id,
      email: admin.auth?.users?.[0]?.email || '未知',
      admin_level: admin.admin_level,
      admin_level_name: getAdminLevelName(admin.admin_level),
      wechat_qr_code_url: admin.wechat_qr_code_url,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
      user_created_at: admin.auth?.users?.[0]?.created_at
    }));

    // 构建总数查询URL
    let countUrl = `${supabaseUrl}/rest/v1/admins?select=count`;
    
    if (admin_level) {
      countUrl += `&admin_level=eq.${admin_level}`;
    }
    if (search) {
      countUrl += `&auth.users.email=ilike.*${search}*`;
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

    // 获取管理员级别统计
    const levelStatsResponse = await fetch(
      `${supabaseUrl}/rest/v1/admins?select=admin_level`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      }
    );

    let levelStats = {};
    if (levelStatsResponse.ok) {
      const allAdmins = await levelStatsResponse.json();
      const stats = {};
      
      allAdmins.forEach(admin => {
        const level = admin.admin_level;
        const levelName = getAdminLevelName(level);
        if (!stats[level]) {
          stats[level] = { name: levelName, count: 0 };
        }
        stats[level].count++;
      });
      
      levelStats = stats;
    }

    const responseData = {
      admins: adminsWithInfo,
      pagination: {
        limit: limit,
        offset: offset,
        total: totalCount,
        has_more: (offset + limit) < totalCount
      },
      stats: {
        level_breakdown: levelStats,
        filtered_count: adminsWithInfo.length
      },
      filters: {
        admin_level: admin_level ? parseInt(admin_level) : null,
        search: search || null
      }
    };

    console.log('管理员列表查询成功:', adminsWithInfo.length, '条记录，总计:', totalCount);

    return new Response(
      JSON.stringify({ data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('获取管理员列表错误:', error);
    return new Response(
      JSON.stringify({
        error: {
          code: 'GET_ADMIN_USERS_FAILED',
          message: error instanceof Error ? error.message : '获取管理员列表失败',
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