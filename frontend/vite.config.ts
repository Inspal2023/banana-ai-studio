import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  plugins: [
    react({
      // 启用JSX运行时优化
      jsxRuntime: 'automatic',
    }), 
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // 启用代码分割和懒加载
    rollupOptions: {
      output: {
        manualChunks: {
          // 分离第三方库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': [
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
            'date-fns',
            'zod',
            'react-hook-form'
          ],
          'charts-vendor': ['recharts']
        },
        // 优化文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // 构建优化
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: isProd,
        drop_debugger: isProd,
        pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : []
      }
    },
    // 启用CSS代码分割
    cssCodeSplit: true,
    // 启用Source Map优化
    sourcemap: !isProd,
    // 设置chunk大小警告限制
    chunkSizeWarningLimit: 1000,
    // Tree shaking已默认启用
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'clsx',
      'tailwind-merge',
      'date-fns'
    ],
    exclude: ['@vite/client', '@vite/env']
  },
  // 开发服务器优化
  server: {
    port: 3000,
    host: true,
    open: true,
    hmr: {
      overlay: false
    }
  },
  // 预览服务器优化
  preview: {
    port: 4173,
    host: true
  },
  // 环境变量优化
  define: {
    __DEV__: !isProd,
    __PROD__: isProd
  }
})

