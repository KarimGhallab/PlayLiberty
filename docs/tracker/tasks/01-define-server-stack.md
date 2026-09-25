# Define the server stack

Status: open
Labels: `enhancement`, `ready-for-human`

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
