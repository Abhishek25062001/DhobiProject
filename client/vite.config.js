import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { developmentApiTarget, waitForApi } from '../shared/runtime.mjs';

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  const serverEnv = loadEnv(mode, fileURLToPath(new URL('../server', import.meta.url)), '');
  const apiUrl = command === 'serve' ? developmentApiTarget(serverEnv.PORT, env.VITE_API_URL) : undefined;

  return {
    plugins: [react(), {
      name: 'wait-for-indodhobi-api',
      apply: 'serve',
      async configureServer(server) {
        server.config.logger.info(`Waiting for the API and database at ${apiUrl}...`);
        await waitForApi(apiUrl);
      },
    }],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          secure: false,
          configure(proxy) {
            proxy.on('error', (_error, _request, response) => {
              if (response && 'writeHead' in response && !response.headersSent) {
                response.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '1' });
                response.end(JSON.stringify({ success: false, code: 'API_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again.' }));
              }
            });
          },
        }
      }
    }
  };
});
