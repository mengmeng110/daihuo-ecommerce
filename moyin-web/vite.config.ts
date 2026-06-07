import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

/**
 * Vite 插件：API CORS 代理
 * 在生产环境也可以由 Node.js 服务器提供此中间件
 */
function apiCorsProxyPlugin(): Plugin {
  return {
    name: 'api-cors-proxy',
    configureServer(server) {
      server.middlewares.use('/__api_proxy', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': '*',
          });
          res.end();
          return;
        }

        const urlParam = new URL(req.url || '', 'http://localhost').searchParams.get('url');
        if (!urlParam) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing ?url= parameter' }));
          return;
        }

        try {
          const targetUrl = new URL(urlParam);
          const fetchHeaders: Record<string, string> = {};
          req.headers && Object.entries(req.headers).forEach(([k, v]) => {
            if (v && !['host', 'connection', 'content-length'].includes(k.toLowerCase())) {
              fetchHeaders[k] = v as string;
            }
          });

          const fetchRes = await fetch(targetUrl.toString(), {
            method: req.method,
            headers: fetchHeaders,
            body: ['GET', 'HEAD'].includes(req.method!) ? undefined : await (req as any).text(),
          });

          const bodyBuf = await fetchRes.arrayBuffer();
          res.writeHead(fetchRes.status, Object.fromEntries(fetchRes.headers.entries()));
          res.end(Buffer.from(bodyBuf));
        } catch (err) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    apiCorsProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        '@opencut/ai-core',
        '@opencut/ai-core/*',
      ],
    },
  },
});
