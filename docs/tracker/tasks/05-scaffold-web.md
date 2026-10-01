# Scaffold the web client skeleton

Status: resolved
Labels: `enhancement`

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

## Outcome

`apps/web` exists, and it builds, lints, tests, serves, and runs in a container. It realizes ADR 0005's
shape and writes no feature behavior.

**Application.** React 19.2.8 and Vite 8.3.1 (Rolldown) with TypeScript 6 and a `tsc --noEmit && vite
build` build. The React Compiler is enabled through `reactCompilerPreset()` from `@vitejs/plugin-react`
6 with `@rolldown/plugin-babel`, which is v6's opt-in path now that the plugin dropped Babel. TanStack
Router drives two code-based routes, the library at `/` and the playlist detail at
`/playlists/$playlistId`, and the shell is the outlet, the player bar and the audio element, with no
sidebar. TanStack Query provides one placeholder query that reads `GET /api/v1/playlists` and validates
it with `createPageSchema(PlaylistSchema)` from the contracts. The client under `src/shared/api` is
same-origin, sends `X-PlayLiberty-Client` on mutations and never on a `GET`, and turns a `401` or an
opaque redirect into a top-level navigation so the edge can re-authenticate.

**Player.** A Zustand 5 store holds the queue, the current track, the position and the playing flag.
`replaceQueue` re-applies the user's order over every refetch: known ids keep their sequence and new ids
append in the server's order. The queue and position persist to `localStorage` on a throttle and flush
on `pagehide` and a hidden tab, and `isPlaying` is never persisted, so a reload never starts audio. One
global `<audio>` element lives in the shell, and the Media Session metadata and handlers are
feature-detected and wrapped in `try/catch`.

**Styling.** SCSS with CSS Modules and BEM. `main.tsx` imports the emitted `@playliberty/tokens/tokens.css`
once, then a base stylesheet carrying `color-scheme: dark`, the token focus ring, thin scrollbars and a
`prefers-reduced-motion` reset. Every colour, size, radius and duration comes from a custom property.
`@playliberty/ui-foundation` supplies the relative last-synced time and the track count in the library
and the duration in the bar, so both clients render the same strings; the tone mapping has no surface
until the track row exists.

**Tests.** Vitest 5 in jsdom with React Testing Library 16, `@testing-library/jest-dom`, MSW 2
(`setupServer` in Node) and axe-core. The player store test covers enqueue, the order-preserving
refetch, removal and hydration; the persistence test covers the round trip, the junk rejection,
hydration without autoplay and the flush on a hidden page; the library test renders through the Query
provider against an MSW handler and runs axe with the contrast rule disabled, because contrast is the
later Playwright ticket's job.

**Container.** `apps/web/deploy/nginx.conf` serves the built SPA, gives hashed assets an immutable year
and `index.html` `no-cache`, falls back to the shell for client routes while `/api` and `/healthz` proxy
to the server, and forwards the standard proxy headers plus, unchanged, the Pangolin `Remote-*` and the
client header. `apps/web/Containerfile` builds on `node:26-bookworm-slim` and installs only the web
dependency graph, so the server's native modules never enter the image, then copies the output into
`nginxinc/nginx-unprivileged:1.31-alpine`, which runs as uid 101 on 8080. Verified with podman: the
image builds, serves `/` and a deep client route, sends the cache headers, and proxies `/api/v1/...` and
`/healthz` to a stub `server` with `X-PlayLiberty-Client` and `Remote-User` intact, all under a
read-only root filesystem with only `/tmp` and `/var/cache/nginx` writable. The image publishes no host
port; the dev `compose.yaml` service publishes a loopback port only, and the production origin wiring
belongs to task `07`.

**Repo wiring.** The `@playliberty/web` path is in `tsconfig.depcruise.json`, the root `web:dev` and
`web:build` scripts exist, `.dockerignore` excludes the Vite cache, and the dev `compose.yaml` gained
the `web` service. Two entries were added to pnpm's `allowBuilds`: `@parcel/watcher` and `msw` are
marked not to run their install scripts, because the watcher ships prebuilds and the MSW script is an
interactive worker init this app does not use. pnpm also recorded two `minimumReleaseAgeExclude` entries
for the TanStack router packages, whose requested lower bound is newer than the configured minimum
release age.

**Docs updated** where the skeleton falsifies them: `AGENTS.md`, `docs/ARCHITECTURE.md` and
`docs/PRODUCT.md` no longer describe the web client as planned, and the two foundation packages task
`10` added are in the indexes now.

**One unrelated repair.** `packages/ui-foundation/src/easing.test.ts` was dropped from the task `10`
commit and had vanished from the tree; it is restored, which brings that package back to its tested
shape.

Verification, all run:

- `pnpm run build`, `pnpm run lint`, `pnpm run format` and `pnpm run test` pass; the web adds 10 tests
  in 3 files, and the full suite is 100.
- `npx depcruise .` reports no violations (105 modules), `npx syncpack lint` finds no issues, and
  `node ./scripts/validate-tsconfig-paths.cjs` is valid.
- `apps/web` builds to `dist/`, and the Vite dev server serves `/` and a deep route.
- The production nginx container publishes no host port and listens on 8080 as a non-root user.
