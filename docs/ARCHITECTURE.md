# Architecture

PlayLiberty is a pnpm workspaces monorepo built with TypeScript (`tsc`). Workspace packages are scoped `@playliberty/*` and consumed through `workspace:*` and the `tsconfig.depcruise.json` paths. Only a thin console app and a shared utility package exist today; the server, the web client, and the mobile client are planned, and their stacks are defined in the tracker tasks `01` to `03`.

## Components

### The applications

- `apps/server` (planned) - owns accounts (from Pangolin identity), playlists, associations, the media store, sync, and streaming. The only component that touches the database, the media root, or yt-dlp.
- `apps/web` (planned) - browser client. Streams from the server; holds no media and no server-side playback state.
- `apps/mobile` (planned) - mobile client, same role as web. Streaming only in v1.
- `apps/console` - runnable Node entry point and development harness. Not a product surface.

### The packages

- `packages/utils` - shared TypeScript utilities: path handling, collections, function helpers, and small types.
- `packages/contracts` (planned) - API types and client shared by the clients and the server, so a change to the API breaks the build rather than the user.
- A YouTube adapter (planned, a package or a server module) - the single seam around yt-dlp and source metadata. No other module shells out to yt-dlp or parses YouTube.

### The stores

One SQLite database and one media root, both owned by the server.

- The database holds accounts, shares, playlists, sources, tracks, associations, suppressions, sync runs, and job state.
- The media root holds `media/<ab>/<videoId>.<ext>` and `thumbnails/<ab>/<videoId>.jpg`, sharded by the first two characters of the video id. Files are keyed by video id only and are opaque to the app.
- Deduplication is server-wide: one file per video id, referenced by every association, across every account.
- There is no global library view in v1, so playlists are the only entry point, but the store is server-wide so a track survives as long as any association references it.

### YouTube

The only external service, reached through yt-dlp behind one adapter. Read during sync for source membership and metadata, and during download for audio. Use is personal, private, and rate-limited; see the product non-goals.

## Sync, end to end

1. A client sends a playlist URL or a single video URL to the server, authenticated by identity forwarded through Pangolin.
2. The server creates a Synced playlist and its source; a sync run starts.
3. The adapter reads the source membership.
4. The sync reconciles it: a new video id becomes a track with `fileStatus: pending`; a known id is left alone; a video missing from the source marks its track `sourceStatus: removed` (retention); suppressed videos are skipped.
5. A DB-backed, in-process job queue downloads pending tracks through yt-dlp with a small concurrency cap, moving each track from `pending` to `downloading` to `stored`, or to `failed` (retryable).
6. The sync run records its counts; the playlist's `lastSyncedAt` and counts update.
7. A weekly job prunes tracks with zero associations.

## Stream, end to end

1. A client requests `GET /tracks/{id}/stream`.
2. The server authorizes it: the account must own, collaborate on, or hold a share on a playlist that associates the track.
3. The server serves the stored file with `Range`, `ETag`, and `Content-Type: audio/mp4`. There is no transcoding and no download endpoint.

## Layer boundaries (normative)

- Packages must never import applications. Enforced by the `no-apps-import` rule in `.dependency-cruiser.cjs`.
- Cycles are forbidden (`no-circular`); orphan modules warn (`no-orphans`).
- Only the server touches the database, the media root, and yt-dlp. Clients reach all of it through the API.
- Workspace dependencies use `workspace:*` and mirror their source paths in `tsconfig.depcruise.json`.
- The application and package scope is `@playliberty/*`.

## Where things live

- `apps/console/src/main.ts` - the console entry point.
- `packages/utils/src/` - utility sources, grouped by area (`utils/`, `types/`).
- `scripts/validate-tsconfig-paths.cjs` - keeps `tsconfig.depcruise.json` paths aligned with the workspace.
- `.dependency-cruiser.cjs` - layer and dependency rules, run on commit.
- `docs/` - product, domain, architecture, design, and decisions.
- `docs/tracker/tasks/` - the stack-definition tasks for server, web, and mobile.

## Deployment shapes

- Local development: `pnpm install`, then `pnpm run build` or `pnpm run watch`; run the console with `pnpm run console:start`.
- Production: private, behind the Pangolin authenticating edge. The origin joins the `pangolin_frontend` network (declared `external`) and never publishes a host port, running as a `systemd --user` Quadlet unit. The server trusts Pangolin's forwarded `Remote-*` headers and fails closed without them. See `docs/adr/0001-private-deployment-behind-pangolin-edge.md` and `docs/adr/0003-identity-via-pangolin-forwarded-headers.md`. No container files exist yet.
- Clients: served through the same edge. The mobile client must resolve how it authenticates through Pangolin, which is a decision in its task.

## Decisions

Non-obvious choices are recorded as ADRs in `docs/adr/`. Read the one that touches what you are changing before you change it.
