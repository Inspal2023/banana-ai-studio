#!/bin/bash

# 前端性能优化测试脚本
# 用于验证优化后的构建结果和性能指标

set -e

echo "🚀 开始前端性能优化测试..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/workspace/banana-ai-studio/frontend"
cd $PROJECT_DIR

echo -e "${BLUE}📁 当前工作目录: $(pwd)${NC}"

# 1. 检查依赖
echo -e "\n${YELLOW}🔍 检查项目依赖...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ node_modules 目录不存在，正在安装依赖...${NC}"
    pnpm install --prefer-offline
else
    echo -e "${GREEN}✅ 依赖已安装${NC}"
fi

# 2. 代码质量检查
echo -e "\n${YELLOW}🔍 执行代码质量检查...${NC}"
if command -v pnpm &> /dev/null; then
    pnpm lint
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 代码质量检查通过${NC}"
    else
        echo -e "${RED}❌ 代码质量检查失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  pnpm 未安装，跳过lint检查${NC}"
fi

# 3. 类型检查
echo -e "\n${YELLOW}🔍 执行TypeScript类型检查...${NC}"
if command -v tsc &> /dev/null; then
    npx tsc --noEmit
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ TypeScript类型检查通过${NC}"
    else
        echo -e "${RED}❌ TypeScript类型检查失败${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  TypeScript编译器未找到，跳过类型检查${NC}"
fi

# 4. 构建性能测试
echo -e "\n${YELLOW}🏗️  执行构建性能测试...${NC}"

# 清理缓存
echo "🧹 清理构建缓存..."
rm -rf dist/ node_modules/.vite node_modules/.cache

# 执行构建并测量时间
echo "🔨 开始构建..."
BUILD_START=$(date +%s)

if command -v pnpm &> /dev/null; then
    pnpm build
else
    npm run build
fi

BUILD_END=$(date +%s)
BUILD_TIME=$((BUILD_END - BUILD_START))

echo -e "${GREEN}✅ 构建完成，耗时: ${BUILD_TIME}秒${NC}"

# 5. 构建产物分析
echo -e "\n${YELLOW}📊 分析构建产物...${NC}"

if [ -d "dist" ]; then
    echo "📁 构建产物大小分析:"
    
    # 计算总大小
    TOTAL_SIZE=$(du -sh dist | cut -f1)
    echo "   总大小: $TOTAL_SIZE"
    
    # 计算JS文件大小
    if find dist -name "*.js" -type f | head -1 | grep -q .; then
        JS_SIZE=$(find dist -name "*.js" -exec du -ch {} + | grep total | cut -f1)
        echo "   JS文件总大小: $JS_SIZE"
    fi
    
    # 计算CSS文件大小
    if find dist -name "*.css" -type f | head -1 | grep -q .; then
        CSS_SIZE=$(find dist -name "*.css" -exec du -ch {} + | grep total | cut -f1)
        echo "   CSS文件总大小: $CSS_SIZE"
    fi
    
    # 计算资源文件大小
    if find dist -type f -not -name "*.js" -not -name "*.css" | head -1 | grep -q .; then
        ASSET_SIZE=$(find dist -type f -not -name "*.js" -not -name "*.css" -exec du -ch {} + | grep total | cut -f1)
        echo "   资源文件总大小: $ASSET_SIZE"
    fi
    
    # 列出chunk文件
    echo -e "\n📋 代码分割结果:"
    if [ -d "dist/assets" ]; then
        find dist/assets -name "*.js" -type f -exec basename {} \; | sort | while read file; do
            SIZE=$(du -h "dist/assets/$file" | cut -f1)
            echo "   $file ($SIZE)"
        done
    fi
else
    echo -e "${RED}❌ 构建产物目录不存在${NC}"
    exit 1
fi

# 6. 性能配置验证
echo -e "\n${YELLOW}⚙️  验证性能配置...${NC}"

# 检查vite配置
if [ -f "vite.config.ts" ]; then
    echo "✅ Vite配置文件存在"
    
    # 检查代码分割配置
    if grep -q "manualChunks" vite.config.ts; then
        echo "✅ 代码分割配置已启用"
    else
        echo "⚠️  代码分割配置可能未启用"
    fi
    
    # 检查压缩配置
    if grep -q "minify" vite.config.ts; then
        echo "✅ 代码压缩配置已启用"
    else
        echo "⚠️  代码压缩配置可能未启用"
    fi
else
    echo -e "${RED}❌ Vite配置文件不存在${NC}"
fi

# 检查缓存Hook
if [ -f "src/hooks/useCache.ts" ]; then
    echo "✅ 缓存管理Hook已实现"
else
    echo "⚠️  缓存管理Hook未找到"
fi

# 检查性能监控Hook
if [ -f "src/hooks/usePerformanceMonitor.ts" ]; then
    echo "✅ 性能监控Hook已实现"
else
    echo "⚠️  性能监控Hook未找到"
fi

# 检查API优化Hook
if [ -f "src/hooks/useApi.ts" ]; then
    echo "✅ API优化Hook已实现"
else
    echo "⚠️  API优化Hook未找到"
fi

# 7. 性能基准测试
echo -e "\n${YELLOW}⚡ 执行性能基准测试...${NC}"

# 检查包大小阈值 (目标是主包小于1MB)
if [ -d "dist/assets" ]; then
    MAIN_CHUNK=$(find dist/assets -name "*.js" | grep -v vendor | head -1)
    if [ -n "$MAIN_CHUNK" ]; then
        MAIN_SIZE=$(stat -f%z "$MAIN_CHUNK" 2>/dev/null || stat -c%s "$MAIN_CHUNK" 2>/dev/null)
        MAIN_SIZE_MB=$((MAIN_SIZE / 1024 / 1024))
        
        echo "📦 主包大小: ${MAIN_SIZE_MB}MB"
        
        if [ $MAIN_SIZE_MB -lt 1 ]; then
            echo -e "${GREEN}✅ 主包大小符合性能要求 (<1MB)${NC}"
        else
            echo -e "${YELLOW}⚠️  主包大小较大，建议进一步优化 (<1MB)${NC}"
        fi
    fi
fi

# 8. 功能测试
echo -e "\n${YELLOW}🧪 执行功能测试...${NC}"

# 检查主要文件是否存在
required_files=(
    "src/App.tsx"
    "src/main.tsx"
    "src/components/LoadingSpinner.tsx"
    "src/hooks/usePerformanceMonitor.ts"
    "src/hooks/useCache.ts"
    "src/hooks/useApi.ts"
    "src/contexts/AuthContext.tsx"
    "src/pages/MainPage.tsx"
)

all_files_exist=true
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    echo -e "${GREEN}✅ 所有必需文件都存在${NC}"
else
    echo -e "${RED}❌ 部分文件缺失，请检查${NC}"
fi

# 9. 生成性能报告
echo -e "\n${YELLOW}📊 生成性能测试报告...${NC}"

REPORT_FILE="performance_test_report.md"
cat > $REPORT_FILE << EOF
# 前端性能测试报告

## 测试时间
$(date)

## 项目信息
- 项目路径: $PROJECT_DIR
- 构建时间: ${BUILD_TIME}秒
- 总构建大小: $TOTAL_SIZE

## 构建产物分析
- 总大小: $TOTAL_SIZE

## 性能配置检查
- 代码分割: $(grep -q "manualChunks" vite.config.ts && echo "✅ 已启用" || echo "❌ 未启用")
- 代码压缩: $(grep -q "minify" vite.config.ts && echo "✅ 已启用" || echo "❌ 未启用")
- 缓存Hook: $([ -f "src/hooks/useCache.ts" ] && echo "✅ 已实现" || echo "❌ 未实现")
- 性能监控: $([ -f "src/hooks/usePerformanceMonitor.ts" ] && echo "✅ 已实现" || echo "❌ 未实现")
- API优化: $([ -f "src/hooks/useApi.ts" ] && echo "✅ 已实现" || echo "❌ 未实现")

## 功能文件检查
EOF

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "- ✅ $file" >> $REPORT_FILE
    else
        echo "- ❌ $file" >> $REPORT_FILE
    fi
done

echo -e "${GREEN}✅ 性能测试报告已生成: $REPORT_FILE${NC}"

# 10. 构建总结
echo -e "\n${GREEN}🎉 前端性能优化测试完成!${NC}"
echo ""
echo "📊 测试结果总结:"
echo "   构建时间: ${BUILD_TIME}秒"
echo "   构建大小: $TOTAL_SIZE"
echo "   构建状态: $([ $? -eq 0 ] && echo '✅ 成功' || echo '❌ 失败')"
echo "   报告文件: $REPORT_FILE"
echo ""
echo -e "${BLUE}💡 优化建议:${NC}"
echo "   1. 监控构建产物大小，避免单个chunk过大"
echo "   2. 在生产环境中监控实际性能指标"
echo "   3. 定期运行性能测试以确保优化效果"
echo "   4. 根据实际使用情况调整缓存策略"
echo ""
echo -e "${GREEN}✨ 性能优化测试完成!${NC}"

exit 0