import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 可选的自定义 fallback UI */
  fallback?: ReactNode;
  /** 错误发生时的回调，可用于上报 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary —— 捕获子组件树中的 JS 渲染错误，防止整个应用白屏。
 *
 * 功能：
 * 1. 捕获并展示错误信息
 * 2. 提供「重试」按钮，重置错误状态重新渲染
 * 3. 提供「返回首页」按钮，导航到根路径
 * 4. 支持自定义 fallback UI 和 onError 回调
 *
 * 用法：
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] 捕获到错误:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果传了自定义 fallback，优先使用
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error } = this.state;

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            {/* 错误图标 */}
            <div style={styles.iconWrapper}>
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e74c3c"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            {/* 标题 */}
            <h2 style={styles.title}>页面出错了</h2>

            {/* 错误描述 */}
            <p style={styles.description}>
              抱歉，页面发生了意外错误。您可以尝试刷新页面或返回首页。
            </p>

            {/* 错误详情（开发环境可折叠查看） */}
            {error && (
              <details style={styles.details}>
                <summary style={styles.summary}>查看错误详情</summary>
                <pre style={styles.errorText}>
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            {/* 操作按钮 */}
            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={styles.primaryButton}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#2980b9';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3498db';
                }}
              >
                🔄 重试
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={styles.secondaryButton}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#bdc3c7';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#ecf0f1';
                }}
              >
                🏠 返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/* ---------- 内联样式 ---------- */

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    padding: '20px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  card: {
    textAlign: 'center' as const,
    maxWidth: 480,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: '40px 32px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    margin: '0 0 12px',
    fontSize: 22,
    fontWeight: 600,
    color: '#2c3e50',
  },
  description: {
    margin: '0 0 24px',
    fontSize: 15,
    color: '#7f8c8d',
    lineHeight: 1.6,
  },
  details: {
    textAlign: 'left' as const,
    marginBottom: 24,
    backgroundColor: '#fdf2f2',
    borderRadius: 8,
    padding: '12px 16px',
    border: '1px solid #f5c6cb',
  },
  summary: {
    cursor: 'pointer',
    fontSize: 13,
    color: '#e74c3c',
    fontWeight: 500,
    outline: 'none',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#c0392b',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
    maxHeight: 200,
    overflow: 'auto',
    lineHeight: 1.5,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    padding: '10px 28px',
    fontSize: 15,
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#3498db',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 28px',
    fontSize: 15,
    fontWeight: 500,
    color: '#2c3e50',
    backgroundColor: '#ecf0f1',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
};

export default ErrorBoundary;
