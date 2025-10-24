#!/bin/bash

# 前端权限控制系统测试脚本
# 用于验证权限控制是否正常工作

echo "================================"
echo "前端权限控制系统测试"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_file_exists() {
    local file_path=$1
    local description=$2
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✓${NC} $description: $file_path"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $file_path (文件不存在)"
        return 1
    fi
}

test_file_contains() {
    local file_path=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file_path" ]; then
        if grep -q "$pattern" "$file_path"; then
            echo -e "${GREEN}✓${NC} $description"
            return 0
        else
            echo -e "${RED}✗${NC} $description"
            return 1
        fi
    else
        echo -e "${RED}✗${NC} 文件不存在: $file_path"
        return 1
    fi
}

echo "开始测试文件结构..."

# 1. 测试核心文件是否存在
echo -e "\n${YELLOW}1. 测试核心权限文件${NC}"
test_file_exists "src/hooks/useAdmin.ts" "权限验证 Hook"
test_file_exists "src/components/AdminRoute.tsx" "管理员路由保护组件"
test_file_exists "src/components/AdminAccessDenied.tsx" "权限拒绝页面组件"

# 2. 测试更新后的文件
echo -e "\n${YELLOW}2. 测试更新后的文件${NC}"
test_file_exists "src/pages/AdminPage.tsx" "管理员页面"
test_file_exists "src/App.tsx" "应用路由配置"
test_file_exists "src/lib/supabase.ts" "Supabase 配置"

# 3. 测试权限系统功能
echo -e "\n${YELLOW}3. 测试权限系统功能${NC}"
test_file_contains "src/hooks/useAdmin.ts" "export function useAdmin" "useAdmin Hook 导出"
test_file_contains "src/hooks/useAdmin.ts" "isAdmin" "管理员权限检查"
test_file_contains "src/hooks/useAdmin.ts" "isSuperAdmin" "超级管理员权限检查"
test_file_contains "src/hooks/useAdmin.ts" "hasPermission" "权限检查方法"

test_file_contains "src/components/AdminRoute.tsx" "export default function AdminRoute" "AdminRoute 组件导出"
test_file_contains "src/components/AdminRoute.tsx" "useAdmin" "使用权限 Hook"
test_file_contains "src/components/AdminRoute.tsx" "requiredLevel" "权限级别参数"

test_file_contains "src/pages/AdminPage.tsx" "useAdmin" "管理员页面使用权限 Hook"
test_file_contains "src/pages/AdminPage.tsx" "AdminAccessDenied" "权限拒绝页面"

# 4. 测试路由配置
echo -e "\n${YELLOW}4. 测试路由配置${NC}"
test_file_contains "src/App.tsx" "AdminRoute" "路由中使用 AdminRoute"
test_file_contains "src/App.tsx" "requiredLevel=\"admin\"" "管理员权限要求"

# 5. 测试环境配置
echo -e "\n${YELLOW}5. 测试环境配置${NC}"
test_file_exists ".env" "环境变量文件"
test_file_exists ".env.example" "环境变量模板"
test_file_contains "src/lib/supabase.ts" "import.meta.env.VITE_SUPABASE" "环境变量使用"

# 6. 测试代码质量
echo -e "\n${YELLOW}6. 测试代码质量${NC}"

# 检查 TypeScript 类型
if command -v tsc &> /dev/null; then
    echo -e "${GREEN}✓${NC} TypeScript 编译器可用"
    # 这里可以添加 TypeScript 检查
else
    echo -e "${YELLOW}⚠${NC} TypeScript 编译器未安装"
fi

# 检查 ESLint
if [ -f "eslint.config.js" ]; then
    echo -e "${GREEN}✓${NC} ESLint 配置存在"
else
    echo -e "${YELLOW}⚠${NC} ESLint 配置不存在"
fi

# 7. 功能测试建议
echo -e "\n${YELLOW}7. 功能测试建议${NC}"
echo -e "${GREEN}建议测试步骤:${NC}"
echo "1. 启动开发服务器: npm run dev 或 yarn dev"
echo "2. 使用普通用户账号登录"
echo "3. 尝试直接访问 /admin 路径"
echo "4. 验证是否正确重定向和显示权限错误页面"
echo "5. 使用管理员账号登录"
echo "6. 验证是否能够正常访问管理员页面"
echo "7. 检查管理员身份标识是否正确显示"

# 8. 安全检查
echo -e "\n${YELLOW}8. 安全检查${NC}"
echo "检查硬编码敏感信息..."

if grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/ 2>/dev/null; then
    echo -e "${RED}✗${NC} 发现可能的硬编码 JWT Token"
else
    echo -e "${GREEN}✓${NC} 未发现硬编码 JWT Token"
fi

if grep -r "https://.*\.supabase\.co" src/ 2>/dev/null | grep -v "import.meta.env" | grep -v "\.env"; then
    echo -e "${RED}✗${NC} 发现可能的硬编码 Supabase URL"
else
    echo -e "${GREEN}✓${NC} 未发现硬编码 Supabase URL"
fi

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}权限控制系统测试完成${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${YELLOW}注意事项:${NC}"
echo "1. 此测试主要检查文件结构和代码存在性"
echo "2. 实际功能测试需要运行应用并使用不同账号测试"
echo "3. 确保 Supabase Edge Function 'verify-admin' 已正确部署"
echo "4. 检查数据库中是否有正确的管理员权限配置"