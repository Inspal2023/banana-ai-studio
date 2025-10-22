# GitHub上传指南

您的项目已经准备就绪！由于GitHub令牌权限限制，需要您手动创建仓库后再推送代码。

## 方法1：在GitHub网站上创建仓库（推荐）

### 步骤1：创建GitHub仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `banana-ai-studio`
   - **Description**: `🍌 香蕉AI工作室 - AI图片处理Web应用 | 线稿图生成 | 三视图生成 | 智能背景替换`
   - **Visibility**: Public（公开）或 Private（私有）
   - **⚠️ 重要**: 不要勾选 "Add a README file"、"Add .gitignore" 或 "Choose a license"
3. 点击 "Create repository" 按钮

### 步骤2：推送代码

创建仓库后，在您的终端执行以下命令：

```bash
cd /workspace/banana-ai-studio-repo

# 如果之前已添加过远程仓库，先删除
git remote remove origin

# 添加远程仓库
git remote add origin https://github.com/inspal2023/banana-ai-studio.git

# 推送到GitHub
git push -u origin main
```

推送时会要求输入凭据：
- **Username**: inspal2023
- **Password**: 使用您的GitHub Personal Access Token（不是密码）

---

## 方法2：使用命令行直接推送（如果您已创建仓库）

如果您已经在GitHub上创建了名为 `banana-ai-studio` 的仓库，直接运行：

```bash
cd /workspace/banana-ai-studio-repo
git push -u origin main
```

---

## 方法3：创建新的Personal Access Token（如需完整权限）

如果希望通过API自动创建仓库，需要创建具有 `repo` 权限的新token：

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 勾选以下权限：
   - ✅ `repo` (Full control of private repositories)
4. 点击 "Generate token"
5. 复制新token，然后告诉我，我可以帮您自动创建并推送

---

## 项目结构说明

```
banana-ai-studio-repo/
├── README.md              # 项目说明文档
├── .gitignore            # Git忽略规则
├── frontend/             # React前端应用
│   ├── src/              # 源代码
│   ├── public/           # 静态资源
│   └── package.json      # 依赖配置
└── supabase/            # Supabase后端
    └── functions/        # Edge Functions
```

---

## 推送成功后

推送成功后，您可以访问：
- **仓库地址**: https://github.com/inspal2023/banana-ai-studio
- **在线预览**: 可以通过GitHub Pages或其他部署平台部署

---

## 遇到问题？

### 问题1：推送时提示 "Repository not found"
**原因**: 仓库尚未创建  
**解决**: 先在GitHub网站上创建仓库（参考方法1）

### 问题2：推送时提示 "Authentication failed"
**原因**: 令牌无效或权限不足  
**解决**: 
1. 确认token是否正确
2. 确认token是否有 `repo` 权限
3. 如果token过期，创建新token

### 问题3：推送被拒绝 "Updates were rejected"
**原因**: 远程仓库有本地没有的提交  
**解决**:
```bash
git pull origin main --rebase
git push -u origin main
```

---

## 下一步建议

✅ 推送成功后建议：
1. 在GitHub仓库设置中添加Topics标签：`react`, `typescript`, `ai`, `image-processing`, `supabase`
2. 添加仓库封面图片（在Settings → Options → Social preview）
3. 考虑添加LICENSE文件（建议MIT License）
4. 考虑设置GitHub Actions进行CI/CD自动部署
