import type { NextConfig } from 'next';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import path from 'path';

/**
 * 带有 Service Worker 支持的 Next.js 配置示例
 * 
 * 使用方法：
 * 1. 安装依赖：pnpm add -D copy-webpack-plugin @types/copy-webpack-plugin
 * 2. 将此文件重命名为 next.config.ts 或合并到现有配置
 */

const nextConfig: NextConfig = {
  // ... 其他配置项
  
  webpack: (config, { isServer, dev }) => {
    // 只在客户端构建时处理 Service Worker
    if (!isServer) {
      // 方案 1: 使用 webpack 编译 Service Worker
      // 注意：这会将 sw.ts 添加到 webpack 入口
      config.entry = {
        ...config.entry,
        sw: {
          import: './public/sw.ts',
          filename: 'static/sw.js',
        },
      };
      
      // 确保 TypeScript loader 处理 sw.ts
      config.module.rules.push({
        test: /public\/sw\.ts$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['last 2 versions'] } }],
                '@babel/preset-typescript',
              ],
            },
          },
        ],
      });
    }
    
    return config;
  },
  
  // 添加响应头以支持 Service Worker
  async headers() {
    return [
      {
        // Service Worker 文件的特殊响应头
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        // 允许 Service Worker 作用域
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;


/**
 * 替代方案：使用脚本手动编译 Service Worker
 * 
 * 创建 scripts/build-sw.ts：
 * 
 * ```typescript
 * import { build } from 'esbuild';
 * import path from 'path';
 * 
 * build({
 *   entryPoints: ['./public/sw.ts'],
 *   bundle: true,
 *   minify: true,
 *   outfile: './public/sw.js',
 *   target: 'es2020',
 *   format: 'iife',
 *   sourcemap: process.env.NODE_ENV === 'development',
 *   define: {
 *     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
 *   },
 * }).catch(() => process.exit(1));
 * ```
 * 
 * 在 package.json 中添加：
 * "scripts": {
 *   "build:sw": "tsx scripts/build-sw.ts",
 *   "build": "npm run build:sw && next build"
 * }
 */


/**
 * 替代方案：使用 next-pwa 插件
 * 
 * 1. 安装：pnpm add next-pwa
 * 2. 配置：
 * 
 * ```typescript
 * import withPWAInit from 'next-pwa';
 * 
 * const withPWA = withPWAInit({
 *   dest: 'public',
 *   register: true,
 *   skipWaiting: true,
 *   disable: process.env.NODE_ENV === 'development',
 * });
 * 
 * export default withPWA({
 *   // Next.js 配置
 * });
 * ```
 */