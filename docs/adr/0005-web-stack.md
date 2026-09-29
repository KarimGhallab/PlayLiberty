# Build the web client as a React 19 and Vite 8 SPA served by nginx

`apps/web` is a client-only single-page application: React 19.2 (pinned to match Expo SDK 57, see `docs/adr/0007-mobile-stack.md`) with the React Compiler enabled, built by Vite 8 (Rolldown) with TypeScript 6 and a `tsc --noEmit && vite build` build. Routing is TanStack Router; server state is TanStack Query v5; the player and queue live in a Zustand 5 store; styling is SCSS with CSS Modules and BEM over CSS custom-property design tokens, dark only. Playback is a single global HTML5 audio element with the Media Session API, and the queue and position persist in `localStorage`. Tests are Vitest 5 with React Testing Library 16, jsdom, and MSW 2, plus axe-core. The client is served by a dedicated nginx container that is the single public origin: it serves the built assets and reverse-proxies `/api` and `/healthz` to the server, so the browser sees one origin and no CORS is needed.

The app is private and authenticated with no SEO surface, so an SPA is the right shape. React matches the repository's TypeScript guideline, which already prescribes the views and shared structure and the component conventions. Vite is the natural build for a client-only app, and the React Compiler removes most manual memoization. TanStack Router gives typed routes and search params, which React Router only offers in its Framework Mode, and TanStack Query carries the sync-status polling and the invalidation after mutations. Zustand keeps the high-frequency player state narrow, since context re-renders every consumer and the compiler does not fix context propagation. Serving through nginx as one origin keeps the no-CORS and CSRF model intact and matches the deployment ADR: nginx is the origin on `pangolin_frontend`, the server sits behind it on a private network, and nginx forwards the Pangolin `Remote-*` headers and the client's CSRF header upstream.

Alternatives rejected:

- Next.js and SvelteKit: SSR or a framework runtime for a private SPA with no SEO surface, and a second server to run.
- React Router v8: a larger ecosystem, but search-param type safety only arrives with Framework Mode, which reimposes a framework-shaped build.
- SWR: smaller, but it lacks the mutation, optimistic-update, and invalidation machinery the sync flow needs.
- Redux Toolkit: slices and actions are disproportionate ceremony for one player store.
- React context plus reducer: every consumer re-renders on each queue change.
- Tailwind, vanilla-extract, and CSS-in-JS: Tailwind is a valid alternative but the repo guideline is SCSS and BEM; vanilla-extract is too much setup here; Emotion and styled-components are legacy choices, and styled-components is in maintenance mode.
- A light theme and a theme toggle: dark only, so the theme is a single token set with no flash-of-wrong-theme problem to solve.
- An animation library: the design is deliberately quiet, so CSS transitions with `prefers-reduced-motion` suffice.
- A PWA and service worker: offline is explicitly deferred, and the mobile surface is task 03.
- In-app keyboard shortcuts: not wanted in v1, which also avoids the character-key-shortcut accessibility requirement.
- Serving the SPA from Fastify on the same origin: rejected in favour of nginx, so static serving and the media route stay separate concerns.
- A two-origin split with CORS: it would widen the CSRF trust boundary for no benefit.
- Plain `fetch` and the Web Audio API: they would re-implement caching and decode that TanStack Query and the media element already provide.

Amendment, from `0010-tabler-icons.md`: the client takes `@tabler/icons-react` for its glyphs, pinned to the same exact version the mobile app pins `@tabler/icons-react-native` to, and imported one icon at a time rather than from the barrel. It is MIT, needs no build plugin, and declares `sideEffects: false`. Nothing in the styling decision changes: the glyphs are SVG elements that take `currentColor` and a size from a token, so they sit inside the SCSS modules and BEM rules above rather than beside them.
