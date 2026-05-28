# Service Worker 使用指南

## 概述

本项目已集成完整的 Service Worker 解决方案，支持以下功能：

1. **静态资源缓存** - Cache-First 策略，加速页面加载
2. **API 响应缓存** - Stale-While-Revalidate 策略，优化 API 请求
3. **离线回退页面** - 优雅的离线体验
4. **后台同步** - 网络恢复后自动同步数据

## 文件结构

```
public/
  sw.ts                          # Service Worker 主文件
  
src/
  lib/
    sw-register.ts               # Service Worker 注册管理器
  hooks/
    use-service-worker.ts        # React Hook
  components/
    service-worker-status.tsx    # 状态显示组件
```

## 集成步骤

### 1. 构建 Service Worker

由于 Service Worker 需要编译 TypeScript，请在 `next.config.ts` 中添加构建配置：

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ... 其他配置
  
  // 配置 webpack 编译 Service Worker
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.entry['sw'] = {
        import: './public/sw.ts',
        filename: '../public/sw.js',
      };
    }
    return config;
  },
};

export default nextConfig;
```

或者使用 `@next/bundle-analyzer` 或自定义构建脚本来编译 `sw.ts`。

### 2. 在应用根组件中注册

在 `app/layout.tsx` 或 `_app.tsx` 中添加 Service Worker 注册：

```tsx
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { getServiceWorkerManager } from '@/lib/sw-register';
import { ServiceWorkerStatus } from '@/components/service-worker-status';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 注册 Service Worker
    const swManager = getServiceWorkerManager();
    swManager.register();
  }, []);

  return (
    <html lang="zh-CN">
      <body>
        {children}
        
        {/* 添加状态指示器（可选） */}
        <ServiceWorkerStatus
          showOnlineStatus={true}
          showUpdateNotification={true}
          position="bottom-right"
        />
      </body>
    </html>
  );
}
```

### 3. 使用 React Hook

在组件中使用 `useServiceWorker` Hook：

```tsx
'use client';

import { useServiceWorker } from '@/hooks/use-service-worker';

export function MyComponent() {
  const {
    state,
    hasUpdate,
    isSyncing,
    lastSyncTime,
    applyUpdate,
    clearCache,
    cacheUrls,
    registerBackgroundSync,
  } = useServiceWorker({
    autoRegister: true,
    onUpdateAvailable: () => {
      console.log('新版本可用！');
    },
    onOnline: () => {
      console.log('网络已恢复');
    },
    onOffline: () => {
      console.log('网络已断开');
    },
  });

  return (
    <div>
      <p>网络状态: {state.isOnline ? '在线' : '离线'}</p>
      <p>Service Worker: {state.isRegistered ? '已启用' : '未启用'}</p>
      
      {hasUpdate && (
        <button onClick={() => {
          applyUpdate();
          window.location.reload();
        }}>
          更新应用
        </button>
      )}
      
      {isSyncing && <p>正在同步...</p>}
      
      {lastSyncTime && (
        <p>上次同步: {lastSyncTime.toLocaleString()}</p>
      )}
    </div>
  );
}
```

### 4. 使用简化版本

如果只需要基本状态：

```tsx
import { useServiceWorkerStatus } from '@/hooks/use-service-worker';

export function SimpleStatus() {
  const { isOnline, hasUpdate, isSyncing } = useServiceWorkerStatus();
  
  return (
    <div>
      {isOnline ? '🟢' : '🔴'} {isOnline ? '在线' : '离线'}
      {hasUpdate && ' 🆕 有更新'}
      {isSyncing && ' 🔄 同步中...'}
    </div>
  );
}
```

## 缓存策略详情

### 静态资源 (Cache-First)

适用于 JS、CSS、图片等静态文件：

1. 首先检查缓存
2. 如果有缓存，立即返回
3. 后台异步更新缓存
4. 如果无缓存，请求网络并缓存

```typescript
// 缓存的文件类型
const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif|mp4|webm)$/i;
```

### API 请求 (Stale-While-Revalidate)

适用于 API 响应：

1. 返回缓存的响应（即使可能过期）
2. 后台异步请求新数据
3. 更新缓存并通知客户端

```typescript
// API 路径模式
const API_PATTERNS = [
  /\/api\/.*$/,
  /\/v\d+\/.*$/,
];
```

**缓存过期时间**：
- API 缓存：5 分钟
- 动态资源：7 天

### 导航请求 (Network-First)

适用于页面导航：

1. 优先请求网络
2. 网络失败时返回缓存
3. 无缓存时显示离线页面

## 后台同步

### 自动同步

Service Worker 会在以下情况触发同步：
- 网络恢复时
- 应用重新激活时

### 手动同步

```typescript
// 注册后台同步
await registerBackgroundSync('my-sync-tag');

// 将失败的请求加入队列
await queueFailedRequest({
  url: '/api/data',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { key: 'value' },
});
```

## 离线页面

离线页面位于 `/offline.html`，当用户离线时访问未缓存的页面会自动显示。

可以通过修改 `sw.ts` 中的 `OFFLINE_PAGE` 常量来更改离线页面路径。

## 缓存管理

### 清除缓存

```typescript
// 清除所有动态缓存
await clearCache();

// 清除指定缓存
await clearCache('api-v1.0.0');
```

### 获取缓存大小

```typescript
const sizes = await getCacheSize();
console.log(sizes);
// {
//   'static-v1.0.0': 15,
//   'dynamic-v1.0.0': 42,
//   'api-v1.0.0': 28,
// }
```

### 手动缓存 URL

```typescript
await cacheUrls([
  '/dashboard',
  '/api/user/profile',
]);
```

## 调试

### Chrome DevTools

1. 打开 Chrome DevTools
2. 进入 Application > Service Workers
3. 查看注册状态和缓存

### 控制台日志

Service Worker 会输出详细的日志：

```
SW: Installing...
SW: Pre-caching static assets
SW: Pre-caching complete
SW: Activating...
SW: Activation complete
```

### 开发环境

在开发环境中，组件会显示额外的调试信息，包括：
- Service Worker 注册状态
- 手动检查更新按钮

## 最佳实践

1. **版本管理** - 更新代码时修改 `CACHE_VERSION`
2. **缓存大小** - 定期清理过期缓存，避免占用过多存储
3. **错误处理** - 网络请求失败时提供友好的离线体验
4. **用户体验** - 显示同步状态和更新通知

## 常见问题

### Q: Service Worker 没有更新？

A: 确保：
1. 修改了 `CACHE_VERSION`
2. 清除了浏览器缓存
3. 使用了 `self.skipWaiting()`

### Q: 缓存占用太多空间？

A: 调整 `MAX_CACHE_SIZE` 配置或手动清除缓存。

### Q: 后台同步不工作？

A: 确保：
1. 浏览器支持 Background Sync API
2. 用户已授予通知权限（某些浏览器需要）
3. Service Worker 处于激活状态

## 浏览器兼容性

- Chrome 45+
- Firefox 44+
- Safari 11.1+
- Edge 17+

## 相关链接

- [MDN Service Worker API](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
- [Workbox](https://developers.google.com/web/tools/workbox/) - Google 的 Service Worker 工具库
- [PWA Builder](https://www.pwabuilder.com/) - PWA 构建工具

---

*文档版本: v1.0.0*  
*最后更新: 2024*