import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * The dev server proxies the API to the running server so the browser sees one
 * origin, the same shape nginx serves in the container. `VITE_API_TARGET`
 * overrides it when the server is not on the default loopback port.
 */
const apiTarget = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8080';

/*
 * The dev server stands in for the Pangolin edge, which is the only thing that
 * injects these headers. Without them the server fails closed with a 401 and the
 * client has nothing to authenticate against. This lives under `server`, which
 * `vite build` ignores and nginx never reads, so the fail-closed path is still
 * the one production runs. The dev server is a local one: anyone who can reach
 * it becomes this user, so do not expose it.
 */
const devIdentity: Readonly<Record<string, string>> = {
  'Remote-User': 'dev-user',
  'Remote-Name': 'Dev User',
  'Remote-Email': 'dev@playliberty.local'
};

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    open: true,
    port: 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: false,
        configure: proxy => {
          proxy.on('proxyReq', proxyReq => {
            for (const [name, value] of Object.entries(devIdentity)) {
              proxyReq.setHeader(name, value);
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
    // camelCase with the underscores kept, so `styles.playerBar__title` resolves.
    modules: { localsConvention: 'dashes' }
  }
});
