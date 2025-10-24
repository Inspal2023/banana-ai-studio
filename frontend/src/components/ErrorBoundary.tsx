import React from 'react';
import { SecurityLogger } from '../lib/validation';

// 安全错误序列化 - 防止敏感信息泄露
const serializeError = (error: any): { message: string; details?: any } => {
  if (error instanceof Error) {
    // 检查是否为开发环境
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // 开发环境：显示详细信息，但过滤敏感信息
      const sensitivePatterns = [
        /password/i,
        /token/i,
        /key/i,
        /secret/i,
        /credential/i,
        /apikey/i,
        /Authorization/i
      ];
      
      let safeMessage = error.message;
      let safeStack = error.stack;
      
      // 过滤敏感信息
      sensitivePatterns.forEach(pattern => {
        safeMessage = safeMessage.replace(pattern, '[FILTERED]');
        safeStack = safeStack?.replace(pattern, '[FILTERED]') || '';
      });
      
      return {
        message: safeMessage,
        details: { stack: safeStack }
      };
    } else {
      // 生产环境：只显示安全信息
      const isSensitiveError = error.message.includes('password') || 
                               error.message.includes('token') ||
                               error.message.includes('key') ||
                               error.message.includes('credential');
      
      if (isSensitiveError) {
        return {
          message: '发生了错误，请刷新页面重试'
        };
      }
      
      // 通用错误处理
      if (error.message.includes('Network Error') || error.message.includes('fetch')) {
        return {
          message: '网络连接失败，请检查网络后重试'
        };
      }
      
      return {
        message: '系统遇到了问题，请稍后再试'
      };
    }
  }
  
  // 非 Error 对象
  return {
    message: '发生了未知错误，请刷新页面重试'
  };
};

// 错误上报函数
const reportError = (error: any, errorInfo: React.ErrorInfo) => {
  const errorDetails = {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // 记录到安全日志
  SecurityLogger.log('ERROR', '前端错误捕获', errorDetails);
  
  // 在开发环境中打印详细错误
  if (import.meta.env.DEV) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: any; resetError: () => void }> },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: any; resetError: () => void }> }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    // 更新 state 使下一次渲染能够显示错误 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 上报错误
    reportError(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }
      
      const errorDetails = serializeError(this.state.error);
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div className="mt-4 text-center">
              <h3 className="text-lg font-medium text-gray-900">出现错误</h3>
              <p className="mt-2 text-sm text-gray-600">{errorDetails.message}</p>
              
              {import.meta.env.DEV && errorDetails.details?.stack && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    错误详情 (开发模式)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {errorDetails.details.stack}
                  </pre>
                </details>
              )}
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={this.resetError}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  重试
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  刷新页面
                </button>
              </div>
              
              <p className="mt-4 text-xs text-gray-500">
                如果问题持续出现，请联系技术支持
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}