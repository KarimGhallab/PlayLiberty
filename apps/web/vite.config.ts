import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/* The dev server proxies the API so the browser sees one origin, the shape
 * nginx serves in the container. `VITE_API_TARGET` overrides the target. */
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080';

/* The dev server stands in for the Pangolin edge, the only injector of the
 * Remote-* headers. It is local and unauthenticated: never expose it. */
const devIdentity: Readonly<Record<string, string>> = {
  'Remote-User': 'dev-user',
  'Remote-Name': 'Dev User',
  'Remote-Email': 'dev@playliberty.local'
};

export default defineConfig({
  /* Sharded E2E runs get one optimizer cache each. */
  cacheDir: process.env.VITE_CACHE_DIR,
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    open: process.env.VITE_NO_OPEN !== '1',
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        configure: proxy => {
          proxy.on('proxyReq', (proxyReq, request) => {
            for (const [name, value] of Object.entries(devIdentity)) {
              const supplied = request.headers[name.toLowerCase()];
              const headerValue =
                typeof supplied === 'string' && supplied.length > 0
                  ? supplied
                  : value;
              proxyReq.setHeader(name, headerValue);
            }
          });
        }
      },
      '/healthz': { target: apiTarget, changeOrigin: false }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  css: {
    // BEM class names stay kebab-case in the .module.scss files and read as
    // camelCase with underscores kept, so `styles.playerBar__title` resolves.
    modules: { localsConvention: 'dashes' }
  }
});
