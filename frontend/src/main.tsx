import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import './index.css'
import App from './App.tsx'

// 性能监控函数
const measurePerformance = () => {
  // 记录页面加载性能
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      const loadTime = perfData.loadEventEnd - perfData.fetchStart;
      console.log(`🚀 页面加载时间: ${loadTime}ms`);
      
      // 在开发环境记录详细性能数据
      if (import.meta.env.DEV) {
        console.log('📊 详细性能数据:', {
          DNS查询: perfData.domainLookupEnd - perfData.domainLookupStart,
          TCP连接: perfData.connectEnd - perfData.connectStart,
          请求响应: perfData.responseEnd - perfData.requestStart,
          DOM解析: perfData.domContentLoadedEventEnd - perfData.responseEnd,
          资源加载: perfData.loadEventEnd - perfData.domContentLoadedEventEnd
        });
      }
    }
  });

  // 监控组件渲染性能
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' && entry.name.startsWith('component-')) {
        console.log(`⚡ 组件渲染: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['measure'] });
  } catch (e) {
    // 兼容性处理
    console.warn('性能监控不可用:', e);
  }
};

// 初始化性能监控
measurePerformance();

const container = document.getElementById('root')!;
const root = createRoot(container);

// 添加错误处理
root.render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
