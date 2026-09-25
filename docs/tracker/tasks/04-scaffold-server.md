# Scaffold the server skeleton

Status: open
Labels: `enhancement`, `ready-for-agent`

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
