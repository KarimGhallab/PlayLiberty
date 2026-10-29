import babel from '@rolldown/plugin-babel';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { type ProxyOptions, defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  /* The config runs in Node before Vite hands `.env` files to the app, so the
   * dev identity is read here. `.env.local` is gitignored and wins. */
  const env = loadEnv(mode, process.cwd(), '');

  /* The dev server proxies the API so the browser sees one origin, the shape
   * nginx serves in the container. `VITE_API_TARGET` overrides the target. */
  const apiTarget =
    env.VITE_API_TARGET ??
    process.env.VITE_API_TARGET ??
    'http://127.0.0.1:8080';

  /* The dev server stands in for the Pangolin edge, the only injector of the
   * Remote-* headers. It is local and unauthenticated: never expose it. The user
   * id must be a real Pangolin user, because the Integration API binds the mobile
   * token to it. */
  const devIdentity: Readonly<Record<string, string>> = {
    'Remote-User':
      env.DEV_REMOTE_USER ?? process.env.DEV_REMOTE_USER ?? 'dev-user',
    'Remote-Name':
      env.DEV_REMOTE_NAME ?? process.env.DEV_REMOTE_NAME ?? 'Dev User',
    'Remote-Email':
      env.DEV_REMOTE_EMAIL ??
      process.env.DEV_REMOTE_EMAIL ??
      'dev@playliberty.local'
  };

  /* The edge assertion every non-test runtime requires; the server's `.env`
   * carries the same default. A caller never gets to choose it. */
  const devEdgeAssertion =
    env.EDGE_ASSERTION ?? process.env.EDGE_ASSERTION ?? 'dev-edge';

  /* The dev server stands in for the edge on every proxied path: it adds the
   * assertion and fills the identity headers a native app cannot send. */
  const configureEdgeHeaders: ProxyOptions['configure'] = proxy => {
    proxy.on('proxyReq', (proxyReq, request) => {
      proxyReq.setHeader('X-PlayLiberty-Edge', devEdgeAssertion);

      for (const [name, value] of Object.entries(devIdentity)) {
        const supplied = request.headers[name.toLowerCase()];
        const headerValue =
          typeof supplied === 'string' && supplied.length > 0
            ? supplied
            : value;
        proxyReq.setHeader(name, headerValue);
      }
    });
  };

  const edgeProxy: ProxyOptions = {
    target: apiTarget,
    changeOrigin: false,
    configure: configureEdgeHeaders
  };

  return {
    /* Sharded E2E runs get one optimizer cache each. */
    cacheDir: process.env.VITE_CACHE_DIR,
    plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
    server: {
      open: process.env.VITE_NO_OPEN !== '1',
      port: 5173,
      proxy: {
        '/api': edgeProxy,
        '/provision': edgeProxy,
        '/auth/exchange': edgeProxy,
        '/healthz': { target: apiTarget, changeOrigin: false }
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    css: {
      // BEM class names stay kebab-case in the `.module.scss` files and read as
      // camelCase with underscores kept, so `styles.playerBar__title` resolves.
      modules: { localsConvention: 'dashes' }
    }
  };
});
