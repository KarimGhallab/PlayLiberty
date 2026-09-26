# Scaffold the server skeleton

Status: resolved
Labels: `enhancement`

## Objective

Create the minimal compiling skeleton for `apps/server` and its two packages, exactly as decided in `docs/adr/0004-server-stack.md`. The goal is a server that builds, lints, tests, and starts, not the product features. Feature behavior is cut into later tickets.

## Context

Read `docs/adr/0004-server-stack.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, and `docs/GLOSSARY.md` first. The stack is settled; this task only realizes its shape.

## Scope

### `packages/contracts`

- Zod schemas for the `/api/v1` surface: account, playlist, track, share, the error shape (`application/problem+json`), and the `{ items, total, limit, offset }` list envelope, with types inferred from the schemas.
- Test the schemas with Vitest.

### `packages/youtube`

- The single seam around yt-dlp and source metadata: a typed interface plus a thin implementation.
- A URL allowlist validator (https, YouTube hosts, no credentials, well-formed ids).
- The `spawn` wrapper with the fixed safety flags: `--ignore-config`, `--use-extractors youtube`, `--js-runtimes node`, explicit playlist behavior, options before `--`, and process-group kill on timeout.
- Ensure the stored M4A is faststart (`-movflags +faststart`), adding a stream-copy ffmpeg remux if yt-dlp's default container fixup does not put `moov` first, so browsers can seek without fetching the file tail.
- No reconciliation logic; that is a later ticket.

### `apps/server`

- Zod-validated environment config loaded at boot, with the variables listed in ADR 0004 and `docs/ARCHITECTURE.md`, including placeholder `PANGOLIN_API_URL`, `PANGOLIN_RESOURCE_ID`, and `PANGOLIN_INTEGRATION_API_KEY` keys that task `07` consumes.
- A pino logger with request-id correlation.
- A database module using `better-sqlite3` plus Drizzle, the full schema (account, playlist, track, association, suppression, share, syncRun), and one committed `drizzle-kit` migration applied at startup.
- The auth hook: read `Remote-*`, auto-provision, fail closed with `401`, and exempt `/healthz` and `/readyz`.
- The CSRF guard from `docs/adr/0006-csrf-defense.md` on mutating routes: require `X-PlayLiberty-Client`, reject when it is missing, check `Origin` and `Sec-Fetch-Site`, and never mutate on `GET`.
- The Fastify application with the `/api/v1` route structure from the task decisions. Only `/healthz`, `/readyz`, and `GET /tracks/:id/stream` need real behavior; the rest may return `501` placeholders behind their schemas so the surface compiles and is testable.
- The worker and the `croner` prune scheduler wired into `onReady` and `onClose`, with the startup sweep that clears stale `.tmp` files and resets `downloading` to `pending`. The worker may be a no-op loop for now.
- Vitest configured, with tests for config parsing, the auth hook, and `/healthz`.

### Repo wiring

- `tsconfig.depcruise.json` paths for the new packages and app.
- Root scripts as needed, for example a `server:start` and a `test` entry.
- `.dockerignore` if the template lacks one.

### Container and deployment

- A multi-stage `Containerfile`: `deps`, `build`, and a `runtime` stage on `docker.io/library/node:26-bookworm-slim`, installing ffmpeg and the pinned, checksum-verified standalone `yt-dlp_linux`, running as a non-root user, root filesystem read-only with tmpfs for `/tmp`, writable volumes for the media root and the database, `EXPOSE 8080`, and a `HEALTHCHECK` against `/healthz`.
- A dev `compose.yaml` that may publish a development port.
- A production Quadlet unit and pod manifest under `deploy/`: no published host port, `pangolin_frontend` declared `external`.

## Out of scope

Sync reconciliation, shares and sharing endpoints, the prune logic, download queue processing, the real behavior of the placeholder routes, and any change to product behavior. Those become their own tickets.

## Blocking edges

None. Task 01 settled the stack, so this can start immediately.

## Verification

- `pnpm run build`, `pnpm run lint`, and `pnpm run format` pass.
- `pnpm run test` passes.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- The server starts locally and `GET /healthz` responds.
- No container file publishes a host port for production; the production unit attaches to `pangolin_frontend` as `external`.

## Outcome

Implemented and verified. `packages/contracts` holds the Zod schemas and inferred types for the `/api/v1` surface; `packages/youtube` holds the URL validator, the yt-dlp argument builders, the `spawn` wrapper with process-group kill, and the faststart remux. `apps/server` is the Fastify 5 application: Zod-validated config, the Drizzle schema with seven tables and a committed initial migration applied at startup, the auth hook (forwarded `Remote-*`, auto-provision, fail closed), the CSRF guard, health and readiness routes, the `/api/v1` route surface with `501` placeholders and real `GET /tracks/:id/stream` and `/thumbnail`, the in-process download worker (a no-op loop), the `croner` prune scheduler, and the startup sweep, all wired into `onReady` and `onClose`. The container artifacts are the multi-stage `Containerfile`, the dev `compose.yaml`, and the production Quadlet unit under `deploy/`.

Notes and deviations:

- The logger is Fastify's built-in pino (level from config, request ids from `genReqId`) rather than a standalone pino instance. Passing a standalone instance made the Fastify instance generic over pino's `Logger`, which broke the shared `FastifyInstance` typing; Fastify's logger is pino, so the requirement holds.
- `skipLibCheck` was added to `tsconfig.base.json`; drizzle-orm and a pino dependency ship declaration files that do not type-check under TypeScript 6.
- `allowBuilds` for `better-sqlite3` and `esbuild` was added to `pnpm-workspace.yaml`; pnpm blocks install scripts by default, and both need to run.
- `no-orphans` in `.dependency-cruiser.cjs` now excludes test files, the `testing/` helper folder, and `*.config.ts` tool configs.
- Node 26 images no longer ship `corepack`, so the `Containerfile` installs the pinned `pnpm@12.4.2` with npm.
- Podman's default OCI output ignores the image `HEALTHCHECK`, so the runtime health is also declared on the compose service and the Quadlet `livenessProbe`; building with `--format docker` honors the image directive.

Verification:

- `pnpm run build`, `pnpm run lint`, and `pnpm run format` pass.
- `pnpm run test` passes: 30 tests (contracts 4, youtube 12, server 14).
- `npx depcruise .` reports 0 violations (53 modules); `npx syncpack lint` and the tsconfig path check pass.
- The server starts and answers `GET /healthz` and `GET /readyz` with `200`, `GET /api/v1/me` with `401` without identity and `200` with it, `GET /api/v1/tracks/:id/stream` with `404` for an unknown track, and a mutating request without the CSRF header with `403`.
- The image builds with podman and the running container serves `/healthz` and `/readyz`, runs as uid 1000, and ships yt-dlp 2026.08.19, ffmpeg 5.1.9, and the migration.
- `deploy/playliberty-server.yaml` publishes only a `containerPort`, never a `hostPort`, and the `.kube` unit attaches to `pangolin_frontend`.
