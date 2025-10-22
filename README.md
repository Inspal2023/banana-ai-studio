# 🍌 香蕉AI工作室 (Banana AI Studio)

一个功能强大的AI图片处理Web应用，提供线稿图生成、三视图生成和智能背景替换功能。

## ✨ 主要功能

### 1. 线稿图生成
- **工程线稿**：适用于产品设计和工程图纸
- **概念线稿**：适用于艺术创作和概念设计
- 支持图片上传，一键生成高质量线稿

### 2. 三视图生成
- 自动生成标准三视图：正视图、侧视图、俯视图
- 适用于产品展示和设计评审
- 保持视角准确性和一致性

### 3. 智能背景替换
- **文字描述模式**：通过文字描述生成新背景
- **上传图片模式**：使用自定义图片作为背景
- **混合模式**：结合文字描述和参考图片
- 集成DeepSeek AI提示词优化功能

## 🚀 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **构建工具**：Vite
- **样式**：Tailwind CSS
- **UI组件**：Lucide React图标库
- **设计风格**：Vibrant & Illustrative（活力插画风格）

### 后端
- **BaaS**：Supabase
  - Edge Functions（Serverless函数）
  - Storage（图片存储）
  - Database（数据持久化）

### AI服务
- **图片生成**：nona-banana AI（多米API）
- **提示词优化**：DeepSeek API

## 📦 项目结构

```
banana-ai-studio-repo/
├── frontend/                 # React前端应用
│   ├── src/
│   │   ├── components/      # React组件
│   │   │   ├── App.tsx
│   │   │   ├── LineArtGenerator.tsx
│   │   │   ├── MultiViewGenerator.tsx
│   │   │   ├── BackgroundReplacer.tsx
│   │   │   ├── ImageUpload.tsx
│   │   │   └── ImagePreview.tsx
│   │   ├── lib/            # 工具库
│   │   │   └── supabase.ts
│   │   └── index.css       # 全局样式
│   ├── public/             # 静态资源
│   ├── package.json
│   └── vite.config.ts
│
└── supabase/               # Supabase后端
    └── functions/          # Edge Functions
        ├── generate-line-art/
        ├── generate-multi-view/
        ├── replace-background/
        └── optimize-prompt/
```

## 🛠️ 本地开发

### 前端开发

```bash
cd frontend
pnpm install
pnpm run dev
```

### 环境变量配置

在 `frontend/` 目录创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase配置

1. 创建Supabase项目
2. 配置Storage Bucket（名称：banana-ai-images）
3. 部署Edge Functions：

```bash
cd supabase/functions
# 部署各个函数
supabase functions deploy generate-line-art
supabase functions deploy generate-multi-view
supabase functions deploy replace-background
supabase functions deploy optimize-prompt
```

4. 设置Edge Function环境变量：
```bash
supabase secrets set DUOMI_API_KEY=your_duomi_api_key
supabase secrets set DEEPSEEK_API_KEY=your_deepseek_api_key
```

## 🎨 设计特点

- **活力插画风格**：浅黄色渐变背景，温暖明亮
- **左右分栏布局**：操作区和结果区并排显示，一屏完成操作
- **Tab导航**：三个功能通过Tab切换，界面简洁
- **立体交互效果**：卡片悬停上浮、阴影加深，交互反馈明确
- **趣味加载动画**：香蕉跑步动效，降低等待焦虑

## 📱 核心功能实现

### 状态管理
- **图片状态共享**：在线稿图上传的图片，切换到三视图和背景替换时自动共享
- **结果状态持久化**：Tab切换时，生成结果不丢失
- **全局生成状态**：任一功能生图时，所有生成按钮禁用

### 异步处理
- 60秒超时保护
- 2秒轮询间隔
- 完善的错误处理机制

### 交互优化
- 图片预览放大功能
- 一键下载生成结果
- 拖拽上传支持
- DeepSeek双语提示词（显示中文，发送英文）

## 🌐 在线演示

最新部署版本：[https://nd7zmeimg7d0.space.minimax.io](https://nd7zmeimg7d0.space.minimax.io)

## 📄 开发历程

- **V1-V3**：核心功能开发和API集成
- **V4**：多角度视图改为标准三视图
- **V5**：按钮状态、加载动画、DeepSeek双语、下载功能优化
- **V6**：异步处理逻辑修复
- **V7-V9**：图片预览交互优化和下载按钮事件隔离
- **V10**：三视图中文乱码修复
- **V11**：UI全面改版（Glassmorphism → Vibrant & Illustrative）
- **V12**：LOGO优化、删除功能、图片状态共享、窗口立体效果
- **Phase 9**：字体、背景渐变、按钮图标化
- **Phase 10**：香蕉跑步动效、黑体字
- **Phase 11**：Tab切换状态管理优化

## 📝 许可证

MIT License

## 👨‍💻 作者

MiniMax Agent

---

**注意**：本项目需要配置多米API和DeepSeek API密钥才能正常使用。请确保已获取相应的API访问权限。
