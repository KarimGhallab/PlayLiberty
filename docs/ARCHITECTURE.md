# Architecture

PlayLiberty is a pnpm workspaces monorepo built with TypeScript (`tsc`). Workspace packages are scoped `@playliberty/*` and consumed through `workspace:*` and the `tsconfig.depcruise.json` paths. The server and web client skeletons exist today, alongside the shared contracts, the design tokens, the shared UI decisions, the localization package, the YouTube adapter, and the utilities; the mobile client is planned. The stacks are decided in `docs/adr/0004-server-stack.md`, `docs/adr/0005-web-stack.md`, and `docs/adr/0007-mobile-stack.md`, and the mobile access model in `docs/adr/0008-mobile-provisioning.md`.

## Components

### The applications

- `apps/server` - owns accounts (from Pangolin identity), playlists, associations, the media store, sync, and streaming. One Node 26 process running Fastify 5, compiled by `tsc`, with downloads and the prune scheduler in the same process. Scaffolded; the feature behavior is still being built. The only component that touches the database, the media root, or yt-dlp, and it does not serve the web client. Its source is four top-level folders, `app/`, `features/`, `shared/`, and `platform/`, whose boundaries are checked rather than agreed. See `docs/adr/0004-server-stack.md` and `docs/adr/0011-server-folder-organisation.md`.
- `apps/web` - React 19.2 and Vite 8 SPA (TanStack Router, TanStack Query, Zustand, SCSS modules, `@tabler/icons-react` for glyphs), with one global audio element and the Media Session API. Scaffolded; the feature behavior is still being built. Served by a dedicated nginx container that is the single public origin and reverse-proxies `/api` and `/healthz` to the server. See `docs/adr/0005-web-stack.md`.
- `apps/mobile` (planned) - Expo SDK 57 React Native app (Expo Router, TanStack Query, Zustand, `expo-audio`, `@tabler/icons-react-native` for glyphs), streaming only. It carries its own per-user Pangolin access token and sends it to the edge. See `docs/adr/0007-mobile-stack.md` and `docs/adr/0008-mobile-provisioning.md`.

### The packages

- `packages/utils` - shared TypeScript utilities: path handling, collections, function helpers, and small types.
- `packages/contracts` - the Zod schemas that define the `/api/v1` REST surface and the types inferred from them, shared by both clients and the server, so a change to the API breaks the build rather than the user.
- `packages/tokens` - the design values as the single source of truth, with the emitter that writes the flat custom-property stylesheet the web client loads and the module the mobile client reads.
- `packages/ui-foundation` - the shared, non-rendering UI decisions language cannot touch: the curve to `Easing.bezier` argument mapping, the sleeve hue, and the track state tone.
- `packages/i18n` - the shared localization: the `en` and `fr` catalogs, the hand-rolled runtime, the locale resolution, the formatters and the React binding, consumed by the web client and the future mobile client.
- `packages/youtube` - the single seam around yt-dlp and source metadata. No other module shells out to yt-dlp or parses YouTube.

### The stores

One SQLite database and one media root, both owned by the server.

- The database holds accounts, playlists, tracks, associations, suppressions, shares, and sync runs, in one SQLite file opened with `better-sqlite3` and Drizzle. A playlist carries its provider and source playlist id; a track carries its provider and video id. Only the server process writes it, under WAL with a busy timeout.
- The media root holds `media/<ab>/<videoId>.<ext>` and `thumbnails/<ab>/<videoId>.jpg`, sharded by the first two characters of the video id. Files are keyed by video id only and are opaque to the app. Stored audio is faststart, so a browser can seek without fetching the file tail.
- Deduplication is server-wide: one file per video id, referenced by every association, across every account.
- There is no global library view in v1, so playlists are the only entry point, but the store is server-wide so a track survives as long as any association references it.

### YouTube

The only external service, reached through yt-dlp behind the `packages/youtube` adapter. Read during sync for source membership and metadata, and during download for audio. Use is personal, private, and rate-limited; see the product non-goals.

### The edge

nginx serves the web client and proxies `/api` and `/healthz` to the server. It is the single public origin on `pangolin_frontend`; the server is never reached by the browser or the phone directly. nginx forwards the Pangolin `Remote-*` headers and the client's `X-PlayLiberty-Client` header upstream, and the server enforces both.

Pangolin authenticates the browser with a session and the mobile app with a per-user access token; in both cases Badger strips any client-supplied identity headers and injects `Remote-*` from the verified credential. Every request stays behind SSO except `POST /auth/exchange`, which is the mobile app's credential-less first contact and is protected by a one-time PKCE-bound code (ADR 0008).

## Mobile access, end to end

1. The app generates `state` and a PKCE verifier and opens `GET /provision` in an in-app browser.
2. Pangolin SSO authenticates the browser; the server sees `Remote-User` and mints a single-use, 60-second code bound to the user, the redirect URI, and the PKCE challenge, then redirects to the app.
3. The app posts the code and verifier to `POST /auth/exchange`, which verifies PKCE, consumes the code atomically, and mints a 180-day per-user Pangolin access token.
4. The app stores the token in the platform keystore and sends it as `P-Access-Token-Id` plus `P-Access-Token`; Badger injects `Remote-*` and the origin behaves exactly as it does for the browser.

## Sync, end to end

1. A client sends a playlist URL or a single video URL to the server, authenticated by identity forwarded through Pangolin, with the CSRF header required by ADR 0006.
2. The server creates a Synced playlist recording its provider and source playlist id, and a sync run starts. Re-pasting a known source returns the existing playlist instead of creating a duplicate.
3. The adapter reads the source membership in one `--flat-playlist` pass, falling back to a single video's details only when a field is missing.
4. The sync reconciles it: a new video id becomes a track with `fileStatus: pending`; a known id is left alone; a video missing from the source marks its track `sourceStatus: removed` (retention); suppressed videos are skipped.
5. The in-process worker downloads pending tracks through yt-dlp with a configurable concurrency cap, into a temp file that is atomically renamed on success, moving each track from `pending` to `downloading` to `stored`, or to `failed` (retried on the next sync). The `track` rows are the queue; there is no jobs table.
6. The sync run records its counts; the playlist's `lastSyncedAt` and counts update.
7. A weekly job prunes tracks with zero associations.

## Stream, end to end

1. The web player or the mobile player requests `GET /api/v1/tracks/{id}/stream`, which nginx proxies to the server. The mobile request carries the Pangolin token and the audio source's auth headers.
2. The server authorizes it: the account must own, collaborate on, or hold a share on a playlist that associates the track.
3. The server serves the stored file through `@fastify/static`, which provides `Range`, `ETag`, conditional GET, and `Content-Type: audio/mp4`. There is no transcoding and no download endpoint.

## Layer boundaries (normative)

- Packages must never import applications. Enforced by the `no-apps-import` rule in `.dependency-cruiser.cjs`.
- Cycles are forbidden (`no-circular`); orphan modules warn (`no-orphans`).
- The server's four top-level folders are a dependency order, not a naming convention. `app/` is the composition root and the request pipeline, `features/` holds one folder per domain module, `shared/` holds cross-cutting code no feature owns, and `platform/` holds the resources features sit on. `platform/` and `shared/` must not import `features/`, and only `app/buildApp.ts` may import a route registrar. Both are enforced by rules in `.dependency-cruiser.cjs`, because a folder layout nothing checks is a suggestion.
- Raw SQL lives in `platform/database/` and in `shared/access/`, and nowhere else. Everywhere else goes through Drizzle, so the schema stays the one description of the storage. Enforced by the `no-restricted-syntax` override in `eslint.config.js`, which exists because a `.prepare()` call is a member expression and not an import, so dependency-cruiser cannot see it.
- Only the server touches the database and the media root, and only `packages/youtube` invokes yt-dlp. Clients reach all of it through the API.
- Every mutating API request carries `X-PlayLiberty-Client` and passes the origin checks in `docs/adr/0006-csrf-defense.md`. Never mutate on `GET`.
- `POST /auth/exchange` is the only path exempt from Pangolin SSO; the server owns its code, PKCE, lifetime, and rate-limit checks.
- Workspace dependencies use `workspace:*` and mirror their source paths in `tsconfig.depcruise.json`. The workspace pins one React and one React Native version.
- The application and package scope is `@playliberty/*`.

## Where things live

- `apps/server/src/main.ts` - the server entry point: load config, open the database, migrate, build the app, listen.
- `apps/server/src/app/` - the composition root and the request pipeline. `buildApp.ts` is the only module that knows every feature exists, `hooks/identity/` resolves the forwarded identity into an account, `hooks/csrf/` holds the mutating-request checks, `health/` answers `/healthz` and `/readyz`, and `testing/createTestContext.ts` builds the real app over a temporary database and media root.
- `apps/server/src/features/` - one folder per domain module, each holding its own routes, its service, and its contracts: `accounts`, `playlists`, `tracks`, `shares`, `sync`, `downloads`, `prune`. A module split across two or more files is grouped in a folder, a role such as `routes/` or `service/` or one named after the module, and a single-file module stays flat.
- `apps/server/src/shared/` - cross-cutting code no feature owns. `context.ts` is the `AppContext` every feature receives, `problem.ts` is the problem document and the two ways a request produces one, and `access/` is the playlist and track authorisation rules.
- `apps/server/src/platform/` - the resources features sit on, with no domain knowledge: `config/`, `database/`, `media/`, and `jobs/`, where `jobs/` owns the timing and the stop handle of a background job and the feature owns what a tick does.
- `apps/server/Containerfile`, `compose.yaml`, and `deploy/` - the server image, the dev stack, and the production Quadlet unit.
- `apps/web/src/` - the web SPA, views under `src/views/` and shared pieces under `src/shared/`. A module split across two or more files is one folder named after it, holding the module, its test and its stylesheet; a single-file module stays flat.
- `apps/web/deploy/nginx.conf` - the static serving and `/api` proxy configuration.
- `apps/mobile/src/` and `apps/mobile/app/` (planned) - the Expo app, routes and feature modules.
- `packages/utils/src/` - utility sources, grouped by area (`utils/`, `types/`).
- `packages/contracts/src/` - the API Zod schemas and inferred types.
- `packages/youtube/src/` - the yt-dlp adapter.
- `scripts/validate-tsconfig-paths.cjs` - keeps `tsconfig.depcruise.json` paths aligned with the workspace.
- `.dependency-cruiser.cjs` - layer and dependency rules, run on commit.
- `docs/` - product, domain, architecture, design, and decisions.
- `docs/tracker/tasks/` - the stack tasks and the scaffold tasks.

## Deployment shapes

- Local development: `pnpm install`, then `pnpm run build` or `pnpm run watch`. The Vite dev server proxies `/api` to the running server; the mobile app runs as a development build against the public origin.
- Production: private, behind the Pangolin authenticating edge. The nginx container is the origin: it joins the `pangolin_frontend` network (declared `external`), never publishes a host port, and serves the SPA while proxying the API to the server on a private network. The server trusts Pangolin's forwarded `Remote-*` headers and fails closed without them. The mobile app is distributed as a sideloaded Android APK. See `docs/adr/0001-private-deployment-behind-pangolin-edge.md`, `docs/adr/0003-identity-via-pangolin-forwarded-headers.md`, `docs/adr/0005-web-stack.md`, `docs/adr/0008-mobile-provisioning.md`, and `docs/adr/0011-server-folder-organisation.md`. The server's `Containerfile`, dev `compose.yaml`, and production Quadlet unit exist, and the web client's `Containerfile`, `nginx.conf` and dev `compose.yaml` service exist; `06-scaffold-mobile` adds the mobile app and `07-provision-mobile-access` the provisioning flow and the edge bypass.
- Clients: the web client is served through the edge; the mobile client carries its own per-user token and streams through the same edge.

## Decisions

Non-obvious choices are recorded as ADRs in `docs/adr/`. Read the one that touches what you are changing before you change it.
