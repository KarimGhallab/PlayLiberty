# Scaffold the web client skeleton

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Create the minimal compiling skeleton for `apps/web` and its nginx serving container, as decided in `docs/adr/0005-web-stack.md`. The goal is an app that builds, lints, tests, and runs, not the product features. Feature behavior is cut into later tickets.

## Context

Read `docs/adr/0005-web-stack.md`, `docs/adr/0006-csrf-defense.md`, `docs/adr/0009-design-system-token-layer.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/DESIGN.md` first. The stack is settled; this task only realizes its shape.

## Scope

### `apps/web` application

- React 19.2 with the React Compiler enabled (`@vitejs/plugin-react` 6 with `@rolldown/plugin-babel`), Vite 8, TypeScript 6, and a `tsc --noEmit && vite build` build.
- App shell with TanStack Router and two placeholder routes, the library at `/` and the playlist
  detail at `/playlists/:id`. Those are the two web screens and there is no third: the screen
  inventory is settled in
  [`13-settle-the-screen-inventory`](13-settle-the-screen-inventory.md), which rejected an account
  surface for web on the grounds that Pangolin sits in front of nginx, so an unauthenticated request
  never reaches the SPA and a signed-out state cannot exist. There is no sidebar and no persistent
  chrome, so the shell is a router outlet and the player bar and nothing else.
- TanStack Query client provider and one placeholder query.
- A Zustand player store, a single global audio element mounted in the shell, and Media Session wiring with feature detection and `try/catch`.
- Queue and position persistence in `localStorage` with throttled writes plus `pagehide` and `visibilitychange`. The queue is client state that never reaches the database, and the order the user sets is re-applied over every refetch, because an order that survives a reload but not a refetch is not a behaviour. It has no surface yet: the queue is a panel specified in the player bar record, and this ticket builds the state without implying a view.
- API client under `src/shared/api` that consumes `packages/contracts` schemas, sends `X-PlayLiberty-Client` on mutations, and turns a `401` or a redirect into a top-level navigation so the edge can re-authenticate.
- SCSS with CSS Modules and BEM, importing the stylesheet emitted by `@playliberty/tokens` once at the app entry, with a base stylesheet carrying `color-scheme: dark`, the focus ring, minimal scrollbar styling, and `prefers-reduced-motion` handling. Every value comes from a token, never from a literal in a module.
- `@playliberty/ui-foundation` for durations, the relative last-synced time, and the track state tone, so the web and mobile clients render the same strings.
- Views under `src/views/<view>/` and shared pieces under `src/shared/`, per the TypeScript guideline.

### Tests

- Vitest 5 with React Testing Library 16, jsdom, and MSW 2 (`setupServer` in Node), with a sample test for the player store and one component test.
- An axe-core check in Vitest for the mechanical rules; contrast is deferred to the later Playwright task.

### nginx serving container

- An `nginx.conf` that serves `dist/`, sets immutable caching for hashed assets and `no-cache` for `index.html`, falls back to `index.html` for client routes while excluding `/api`, and proxies `/api` and `/healthz` to the server, forwarding request headers.
- A `Containerfile` running nginx as a non-root user on an unprivileged port, ready to join `pangolin_frontend` with no published host port in production.

### Repo wiring

- `tsconfig.depcruise.json` path for `apps/web`.
- Root scripts such as `web:dev` and `web:build`.
- `.dockerignore` entries for the web build.

## Out of scope

Real feature behavior beyond the placeholders, end-to-end Playwright tests (a later task), and the mobile client.

## Blocking edges

Blocked by `10-build-design-foundation`, which produces the token stylesheet and the shared UI decisions this app renders with. It also consumes `packages/contracts` from task 01.

## Verification

- `pnpm run build`, `pnpm run lint`, `pnpm run format`, and `pnpm run test` pass.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- `apps/web` builds to `dist/` and the dev server serves it.
- The production nginx container publishes no host port and listens on an unprivileged port.
