#!/bin/bash

# GitHub仓库上传脚本
# 作者：MiniMax Agent
# 日期：2025-10-22

set -e

echo "🍌 香蕉AI工作室 - GitHub上传脚本"
echo "================================="
echo ""

# 进入项目目录
cd /workspace/banana-ai-studio-repo

echo "📂 当前目录: $(pwd)"
echo ""

# 检查Git状态
echo "🔍 检查Git状态..."
git status
echo ""

# 删除旧的远程仓库（如果存在）
echo "🗑️  清理旧的远程仓库配置..."
git remote remove origin 2>/dev/null || true
echo ""

# 添加远程仓库
echo "🔗 添加远程仓库: https://github.com/inspal2023/banana-ai-studio.git"
git remote add origin https://github.com/inspal2023/banana-ai-studio.git
echo ""

# 显示远程仓库
echo "📡 远程仓库配置:"
git remote -v
echo ""

# 推送到GitHub
echo "🚀 开始推送到GitHub..."
echo "⚠️  如果提示输入密码，请使用您的GitHub Personal Access Token"
echo ""

git push -u origin main

echo ""
echo "✅ 上传完成！"
echo "🌐 仓库地址: https://github.com/inspal2023/banana-ai-studio"
echo "📝 请访问上述地址查看您的项目"
