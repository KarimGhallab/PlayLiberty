# Scaffold the web client skeleton

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Create the minimal compiling skeleton for `apps/web` and its nginx serving container, as decided in `docs/adr/0005-web-stack.md`. The goal is an app that builds, lints, tests, and runs, not the product features. Feature behavior is cut into later tickets.

## Context

Read `docs/adr/0005-web-stack.md`, `docs/adr/0006-csrf-defense.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/DESIGN.md` first. The stack is settled; this task only realizes its shape.

## Scope

### `apps/web` application

- React 19.2 with the React Compiler enabled (`@vitejs/plugin-react` 6 with `@rolldown/plugin-babel`), Vite 8, TypeScript 6, and a `tsc --noEmit && vite build` build.
- App shell with TanStack Router and placeholder routes for the playlists list, the playlist detail, and the account and sharing screen.
- TanStack Query client provider and one placeholder query.
- A Zustand player store, a single global audio element mounted in the shell, and Media Session wiring with feature detection and `try/catch`.
- Queue and position persistence in `localStorage` with throttled writes plus `pagehide` and `visibilitychange`.
- API client under `src/shared/api` that consumes `packages/contracts` schemas, sends `X-PlayLiberty-Client` on mutations, and turns a `401` or a redirect into a top-level navigation so the edge can re-authenticate.
- SCSS with CSS Modules and BEM over the dark-only `docs/DESIGN.md` tokens as CSS custom properties, a base stylesheet with `color-scheme: dark`, and `prefers-reduced-motion` handling.
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

None. It consumes `packages/contracts` from task 01.

## Verification

- `pnpm run build`, `pnpm run lint`, `pnpm run format`, and `pnpm run test` pass.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- `apps/web` builds to `dist/` and the dev server serves it.
- The production nginx container publishes no host port and listens on an unprivileged port.
