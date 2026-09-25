# Define the server stack

Status: resolved
Labels: `enhancement`

## Objective

Choose and record the stack for `apps/server`, the component that owns accounts, playlists, the media store, sync, and streaming, through a grilling session. Scaffold only what the decision requires.

## Context

Read `docs/PRODUCT.md`, `docs/GLOSSARY.md`, and `docs/ARCHITECTURE.md` first. The product behavior is settled; this task is only the server's technology and shape.

## Decisions to settle

- Runtime and HTTP framework.
- Database: the SQLite driver and access layer (ORM or raw SQL), the schema for Account, Share, Playlist, Source, Track, Association, Suppression, SyncRun, and job state, and the migration approach.
- API style and the shape of `packages/contracts`, including the streaming endpoint contract.
- The yt-dlp adapter: how the binary is pinned and invoked, concurrency, rate limiting, retries, and how source metadata is parsed.
- The in-process job queue and the weekly orphan-prune scheduler.
- Auth: trusting Pangolin's forwarded headers, fail-closed, and the first-admin bootstrap.
- The streaming handler: `Range`, `ETag`, MIME, and per-request authorization.
- The media root layout and configuration.
- Deployment: Containerfile, compose for dev, and the production Quadlet unit, honoring no published host port and `pangolin_frontend` as `external`.
- Logging and observability.

## Out of scope

The web and mobile stacks (tasks 02 and 03), and any product behavior change.

## Blocking edges

None. This task can start immediately.

## Verification

- An ADR in `docs/adr/` records the chosen stack and the alternatives rejected.
- `pnpm run build` and `pnpm run lint` pass with the scaffolded server.
- `npx depcruise .` and `npx syncpack lint` pass.
- No container file publishes a host port; the production unit attaches to `pangolin_frontend` as `external`.

## Outcome

Resolved by a grilling session. The stack is recorded in `docs/adr/0004-server-stack.md`: Node 26 with Fastify 5, `tsc` output, `better-sqlite3` plus Drizzle on local SQLite, the `/api/v1` REST surface in Zod, `packages/youtube` as the only yt-dlp seam, an in-process worker and `croner` prune with the `track` rows as the queue, and a per-request authorized streaming route. The schema, API surface, sync pipeline, and deployment shape are in that ADR and in `docs/ARCHITECTURE.md`.

The build, lint, test, depcruise, and container checks are carried out by `04-scaffold-server`, which creates the skeleton. This task resolves on the decision.
