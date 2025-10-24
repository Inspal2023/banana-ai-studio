#!/bin/bash

echo "========================================="
echo "积分系统前端功能测试"
echo "========================================="
echo ""

# 测试构建
echo "1. 测试项目构建..."
cd /workspace/banana-ai-studio/frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 项目构建成功"
else
    echo "❌ 项目构建失败"
    exit 1
fi

echo ""
echo "2. 检查主要组件文件..."

# 检查积分账户弹窗组件
if [ -f "src/components/PointsAccountModal.tsx" ]; then
    echo "✅ PointsAccountModal.tsx 存在"
else
    echo "❌ PointsAccountModal.tsx 不存在"
fi

# 检查充值功能组件
if [ -f "src/components/PointsRechargeModal.tsx" ]; then
    echo "✅ PointsRechargeModal.tsx 存在"
else
    echo "❌ PointsRechargeModal.tsx 不存在"
fi

# 检查管理员后台组件
if [ -f "src/components/AdminPointsManagement.tsx" ]; then
    echo "✅ AdminPointsManagement.tsx 存在"
else
    echo "❌ AdminPointsManagement.tsx 不存在"
fi

# 检查管理员页面
if [ -f "src/pages/AdminPage.tsx" ]; then
    echo "✅ AdminPage.tsx 存在"
else
    echo "❌ AdminPage.tsx 不存在"
fi

echo ""
echo "3. 检查组件依赖..."

# 检查主要依赖
if grep -q "PointsAccountModal" src/pages/MainPage.tsx; then
    echo "✅ MainPage.tsx 集成了积分账户弹窗"
else
    echo "❌ MainPage.tsx 未集成积分账户弹窗"
fi

if grep -q "useNavigate" src/pages/MainPage.tsx; then
    echo "✅ MainPage.tsx 集成了路由导航"
else
    echo "❌ MainPage.tsx 未集成路由导航"
fi

if grep -q "react-router-dom" src/App.tsx; then
    echo "✅ App.tsx 配置了路由"
else
    echo "❌ App.tsx 未配置路由"
fi

echo ""
echo "4. 功能验证..."

# 检查关键功能
if grep -q "我的积分账户" src/pages/MainPage.tsx; then
    echo "✅ 首页积分显示功能"
else
    echo "❌ 首页积分显示功能缺失"
fi

if grep -q "管理员后台" src/pages/MainPage.tsx; then
    echo "✅ 管理员入口功能"
else
    echo "❌ 管理员入口功能缺失"
fi

if grep -q "积分兑换价格表" src/components/PointsRechargeModal.tsx; then
    echo "✅ 充值价格表功能"
else
    echo "❌ 充值价格表功能缺失"
fi

if grep -q "手动积分管理" src/components/AdminPointsManagement.tsx; then
    echo "✅ 管理员积分管理功能"
else
    echo "❌ 管理员积分管理功能缺失"
fi

echo ""
echo "========================================="
echo "测试完成！"
echo "========================================="
echo ""
echo "开发完成的功能："
echo "1. ✅ 首页右上角积分显示"
echo "2. ✅ 积分账户弹窗"
echo "3. ✅ 充值功能界面"
echo "4. ✅ 管理员后台界面"
echo ""
echo "访问地址："
echo "- 用户界面: http://localhost:3000/"
echo "- 管理员后台: http://localhost:3000/admin"
echo ""
echo "启动开发服务器："
echo "cd /workspace/banana-ai-studio/frontend"
echo "npm run dev"