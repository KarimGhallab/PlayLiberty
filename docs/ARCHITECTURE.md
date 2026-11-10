# Architecture

PlayLiberty is a pnpm workspaces monorepo built with TypeScript (`tsc`). Workspace packages are scoped `@playliberty/*` and consumed through `workspace:*` and the `tsconfig.depcruise.json` paths. The server, web client, mobile client, shared contracts, the shared client protocol, the shared playable rule, design tokens, shared UI decisions, localization package, shared query keys, and YouTube adapter exist. The mobile app is distributed as a signed, sideloaded Android APK. The non-obvious choices are stated in [Decisions](#decisions).

## Components

### The applications

- `apps/server` - owns accounts (from Pangolin identity), playlists, associations, the media store, sync, and streaming. One Node 26 process running Fastify 5, compiled by `tsc`, with downloads and the prune scheduler in the same process. The only component that touches the database, the media root, or yt-dlp, and it does not serve the web client. Its source is four top-level folders, `app/`, `features/`, `shared/`, and `platform/`, whose boundaries are checked rather than agreed. See [The server stack](#the-server-stack) and [The server's folder boundaries](#the-servers-folder-boundaries).
- `apps/web` - React 19.3 and Vite 8 SPA (TanStack Router, TanStack Query, Zustand, SCSS modules, `@tabler/icons-react` for glyphs), with one global audio element and the Media Session API. Served by a dedicated nginx container that is the single public origin and reverse-proxies `/api` and `/healthz` to the server. See [The web stack](#the-web-stack).
- `apps/egress-agent` - the system-scoped host agent that runs yt-dlp in the `playliberty-egress` network namespace. See [The YouTube egress runs in a host network namespace](#the-youtube-egress-runs-in-a-host-network-namespace).
- `apps/mobile` - Expo SDK 57 React Native app (Expo Router, TanStack Query, Zustand, `expo-audio`, `@tabler/icons-react-native` for glyphs), streaming only. It carries its own per-user Pangolin access token and sends it to the edge. See [The mobile stack](#the-mobile-stack) and [Mobile provisioning](#mobile-provisioning).

### The packages

- `packages/contracts` - the Zod schemas that define the `/api/v1` REST surface and the types inferred from them, shared by both clients and the server, so a change to the API breaks the build rather than the user.
- `packages/api-client` - the shared client for the API: one transport, one error type, one hook per endpoint, the bulk sync batch, and the client-side address and credential header builders. It reads the keys, the invalidation and the optimistic patch from `@playliberty/query`; each client supplies only its auth adapter and its sync mutation, so a read or a command cannot drift.
- `packages/query` - the keys, the cache effects, the optimistic patch and its restore, and the library page patchers, so neither client can name a read or undo a write its own way.
- `packages/library` - the library policy both clients share: who may write, the playlist and track action lists, the syncable set, the gallery totals and groups, and the batch busy rule. Action keys and label keys stay here; each app owns the glyphs and controls.
- `packages/player` - the pure player rules: the playable check, the queue order, the shuffle and its leader, the random draw, the refetch merge, the seek bound and the grace before Previous, called by both stores.
- `packages/tokens` - the design values as the single source of truth, with the emitter that writes the flat custom-property stylesheet the web client loads and the module the mobile client reads.
- `packages/ui-foundation` - the shared, non-rendering UI decisions language cannot touch: the track-state chip table and its total, the stream verdict, the cover chain selector, the share mark state, the curve to `Easing.bezier` argument mapping, the sleeve hue, and the track state tone.
- `packages/i18n` - the shared localization: the `en` and `fr` catalogs, the hand-rolled runtime, the locale resolution, the formatters, the failure sentences, the track-link notices, the egress vocabulary and the React binding, consumed by the web client and the mobile client.
- `packages/youtube` - the single seam around yt-dlp and source metadata. No other module shells out to yt-dlp or parses YouTube.

### The stores

One SQLite database and one media root, both owned by the server.

- The database holds accounts, playlists, tracks, associations, suppressions, shares, and sync runs, in one SQLite file opened with `better-sqlite3` and Drizzle. A playlist carries its provider, its source playlist id, an optional server-only cover path, and the cover version the contract exposes (`coverUpdatedAt`); a track carries its provider and video id. Only the server process writes it, under WAL with a busy timeout.
- The media root holds `media/<ab>/<videoId>.<ext>`, `thumbnails/<ab>/<videoId>.jpg` and `covers/<playlistId>-<token>.webp`. Audio and thumbnails are sharded by the first two characters of the video id; a cover is named by its playlist and a random token. Stored audio is faststart, so a browser can seek without fetching the file tail.
- Audio deduplication is server-wide: one file per video id, referenced by every association, across every account. Covers are not deduplicated: a playlist holds one custom cover file per version.
- The store is server-wide, so a track survives as long as any association references it.

### YouTube

The only external service, reached through yt-dlp behind the `packages/youtube` adapter. Read during sync for source membership and metadata, and during download for audio. Use is personal, private, and rate-limited; see the product non-goals.

### The edge

nginx serves the web client and proxies `/api` and `/healthz` to the server. It is the single public origin on `pangolin_frontend`; the server is never reached by the browser or the phone directly. nginx forwards the Pangolin `Remote-*` headers and the client's `X-PlayLiberty-Client` header upstream, and the server enforces both.

Pangolin authenticates the browser with a session and the mobile app with a per-user access token; in both cases Badger strips any client-supplied identity headers and injects `Remote-*` from the verified credential. Every request stays behind SSO except the static association file and the mobile app's two auth endpoints; [the Pangolin edge runbook](../deploy/pangolin/README.md#the-bypass-rules) owns the exact bypass paths and the guards that remain. The association file is public because Android verifies it without a session; it names only the package and signing fingerprints.

## Mobile access, end to end

1. The app generates `state` and a PKCE verifier and opens `GET /provision` in an in-app browser.
2. Pangolin SSO authenticates the browser; the server sees `Remote-User` and mints a single-use, 60-second code bound to the user, the redirect URI, and the PKCE challenge, then redirects to the app.
3. The app posts the code and verifier to `POST /auth/exchange`, which verifies PKCE, consumes the code atomically, and mints a short-lived per-user Pangolin access token plus a refresh family.
4. The app stores one credential record: the access pair with a local deadline, and the refresh token. Before the access token lapses it renews silently at `POST /auth/refresh`, which rotates the pair. A replayed consumed token inside a 30-second grace window gets the same pair; a replay later revokes the family.
5. Requests carry the access pair as `P-Access-Token-Id` plus `P-Access-Token`; Badger injects `Remote-*` and the origin behaves exactly as it does for the browser. Sign-out asks the server to revoke the family, then clears the device, best effort.

## Sync, end to end

1. A client sends a playlist URL or a single video URL to the server, authenticated by identity forwarded through Pangolin, with the client header every mutation must carry.
2. The server creates a Synced playlist recording its provider and source playlist id, and a sync run starts. Re-pasting a known source returns the existing playlist instead of creating a duplicate.
3. The adapter reads the source membership in one `--flat-playlist` pass, falling back to a single video's details only when a field is missing.
4. The sync reconciles it: a new video id becomes a track with `fileStatus: pending`; a known id is left alone; a video missing from the source marks its track `sourceStatus: removed` (retention); suppressed videos are skipped.
5. The in-process worker downloads pending tracks through yt-dlp with a configurable concurrency cap, into a temp file that is atomically renamed on success, moving each track from `pending` to `downloading` to `stored`, or to `failed` (retried on the next sync). The `track` rows are the queue; there is no jobs table.
6. The sync run records its counts; the playlist's `lastSyncedAt` and counts update. A sync never writes, replaces or clears the custom cover path or version.
7. A weekly job prunes tracks with zero associations and sweeps unreferenced cover files older than an hour.

## Stream, end to end

1. The web player or the mobile player requests `GET /api/v1/tracks/{id}/stream`, which nginx proxies to the server. The mobile request carries the Pangolin token and the audio source's auth headers.
2. The server authorizes it: the account must own, collaborate on, or hold a share on a playlist that associates the track.
3. The server serves the stored file through `@fastify/static`, which provides `Range`, `ETag`, conditional GET, and `Content-Type: audio/mp4`. There is no audio transcoding and no download endpoint.

## Layer boundaries (normative)

- Packages must never import applications. Enforced by the `no-apps-import` rule in `.dependency-cruiser.cjs`.
- Cycles are forbidden (`no-circular`); orphan modules warn (`no-orphans`).
- The server's four top-level folders are a dependency order, not a naming convention. `app/` is the composition root and the request pipeline, `features/` holds one folder per domain module, `shared/` holds cross-cutting code no feature owns, and `platform/` holds the resources features sit on. `platform/` and `shared/` must not import `features/`, and only `app/buildApp.ts` may import a route registrar. Both are enforced by rules in `.dependency-cruiser.cjs`, because a folder layout nothing checks is a suggestion.
- Raw SQL lives in `platform/database/` and in `shared/access/`, and nowhere else. Everywhere else goes through Drizzle, so the schema stays the one description of the storage. Enforced by the `no-restricted-syntax` override in `eslint.config.js`, which exists because a `.prepare()` call is a member expression and not an import, so dependency-cruiser cannot see it.
- Only the server touches the database and the media root, and only `packages/youtube` invokes yt-dlp. Clients reach all of it through the API.
- Every mutating API request carries `X-PlayLiberty-Client` and passes the `Origin` and `Sec-Fetch-Site` checks. Never mutate on `GET`.
- Only the paths in the [Pangolin edge runbook](../deploy/pangolin/README.md#the-bypass-rules) are exempt from Pangolin SSO; every other path stays behind it.
- Workspace dependencies use `workspace:*` and mirror their source paths in `tsconfig.depcruise.json`. The workspace pins one React and one React Native version.
- The application and package scope is `@playliberty/*`.

## Where things live

- `apps/server/src/main.ts` - the server entry point: load config, open the database, migrate, build the app, listen.
- `apps/server/src/app/` - the composition root and the request pipeline. `buildApp.ts` is the only module that knows every feature exists, `hooks/identity/` resolves the forwarded identity into an account, `hooks/csrf/` holds the mutating-request checks, `health/` answers `/healthz` and `/readyz`, and `testing/createTestContext.ts` builds the real app over a temporary database and media root.
- `apps/server/src/features/` - one folder per domain module, each holding its own routes, its service, and its contracts: `accounts`, `playlists`, `tracks`, `shares`, `sync`, `downloads`, `prune`. A module split across two or more files is grouped in a folder, a role such as `routes/` or `service/` or one named after the module, and a single-file module stays flat.
- `apps/server/src/shared/` - cross-cutting code no feature owns. `context.ts` is the `AppContext` every feature receives, `problem.ts` is the problem document and the two ways a request produces one, and `access/` is the playlist and track authorisation rules.
- `apps/server/src/platform/` - the resources features sit on, with no domain knowledge: `config/`, `database/`, `media/`, and `jobs/`, where `jobs/` owns the timing and the stop handle of a background job and the feature owns what a tick does.
- `apps/server/Containerfile`, `apps/web/Containerfile`, `compose.yaml`, and `deploy/` - the server and web images, the dev stack, and the production units: the user-scoped web pod and the system-scoped egress agent.
- `apps/egress-agent/src/` - the host agent: the pool reader, the switch and check modules, the WireGuard and process helpers, the HTTP-on-Unix-socket server, and the remembered active state.
- `deploy/systemd/playliberty-egress.service` - the system unit that creates the namespace and runs the agent inside it.
- `deploy/egress/` - the idempotent namespace up/down scripts, the run wrapper, and the environment example.
- `docs/runbooks/egress-agent.md` - the host install, verification and reboot runbook.
- `apps/web/src/` - the web SPA, views under `src/views/` and shared pieces under `src/shared/`. A module split across two or more files is one folder named after it, holding the module, its test and its stylesheet; a single-file module stays flat.
- `apps/web/deploy/nginx.conf.template` - the static serving and `/api` proxy configuration, rendered by the nginx entrypoint at container start.
- `apps/mobile/src/` and `apps/mobile/app/` - the Expo app, routes and feature modules.
- `e2e/web/` - the Playwright journeys: specs, support, per-worker server and web stacks, and the parallel runner.
- `e2e/mobile/` - the Maestro flows, the device-only flow, the harness shell, the seed and the Maestro runner.
- `e2e/shared/` - the scenario contract and the playlist and video URL builders both suites use.
- `packages/contracts/src/` - the API Zod schemas and inferred types.
- `packages/youtube/src/` - the yt-dlp adapter.
- `scripts/validate-tsconfig-paths.cjs` - keeps `tsconfig.depcruise.json` paths aligned with the workspace.
- `deploy/build-production-deployment.mjs` - the production build command behind `pnpm deploy:build-for-production`: it builds the `:latest` images, creates `/srv/playliberty`, checks the unit's Node, validates the egress pool, adds the AppArmor local rules when present, allows its endpoints through UFW when UFW is active, extracts the image's yt-dlp, and ensures the three Podman secrets. It never installs or starts the unit.
- `.dependency-cruiser.cjs` - layer and dependency rules, run on commit.
- `docs/` - product, domain, architecture, and decisions.
- `docs/tracker/tasks/` - the stack tasks and the scaffold tasks.

## Deployment shapes

- Local development: `pnpm install`, then `pnpm run build` or `pnpm run watch`. The Vite dev server proxies `/api` to the running server; the mobile app runs as a development build against the public origin.
- Production: private, behind the Pangolin authenticating edge. The nginx origin serves the SPA and proxies the API to the server over the pod-local loopback; the concrete network and container rules live in [Deployment behind the Pangolin edge](#deployment-behind-the-pangolin-edge). The mobile app is distributed as a signed, sideloaded Android APK; a development build is debug-signed, so a release installs over it only after an uninstall (spec `32`). The server and web `Containerfile`s, the dev `compose.yaml`, and the production units exist: the user-scoped `deploy/quadlet/playliberty-web.kube` runs one pod with the nginx front and the server backend, where only the front is reachable on the edge network, and the system-scoped `deploy/systemd/playliberty-egress.service` runs the YouTube egress in its own namespace. The pod mounts `/run/playliberty` read-only for the agent socket. The host is prepared by `pnpm deploy:build-for-production`, which builds the images, creates `/srv/playliberty`, prepares the egress host, and ensures `playliberty_edge_assertion`, `playliberty_public_origin` and the optional `pangolin_admin_user`. The unit maps the deploying user to container UID 1000 with `UserNS=keep-id:uid=1000,gid=1000`. `06-scaffold-mobile` built the mobile app and `07-provision-mobile-access` the provisioning flow and the edge bypass.
- Clients: the web client is served through the edge; the mobile client carries its own per-user token and streams through the same edge.

## Decisions

The non-obvious choices, stated once and normative. Read the entry that touches what you are changing before you change it.

### Deployment behind the Pangolin edge

Production is private, behind the Pangolin authenticating edge. The origin never publishes a host port and attaches to the shared `pangolin_frontend` network declared `external`, running as a `systemd --user` Quadlet unit. Pangolin supplies the authentication the service would otherwise build, and an unauthenticated port would put a personal media service and its YouTube dependency on the network. The host is prepared by the build command, not by a deploy command; installing and starting the unit remains the operator's job. The concrete container rules live in the deployment guideline.

### The YouTube egress runs in a host network namespace

The YouTube listing and download run in `apps/egress-agent`, a system-scoped root unit, inside the `playliberty-egress` network namespace. The unit creates the namespace, the veth that carries only the WireGuard endpoint, and `wg0`; it applies the active config's `Address` and `DNS`, writes `/etc/netns/playliberty-egress/resolv.conf`, disables IPv6, and runs the agent with `ip netns exec`. The namespace's only default route is `wg0`; the endpoint `/32` is the only destination routed over the veth. A switch is `wg syncconf` on that interface, with the new endpoint's `/32` route over the veth, so it never recreates the interface, never changes the host default route, and never touches sshd or the VPS address. The host forwards only the pool's endpoint IP:port pairs from the namespace and masquerades them out the existing default route.

The pod's security context and netns are untouched: it keeps `drop: ALL`, its read-only root, its own network namespace and its user. It mounts `/run/playliberty` read-only for the agent socket and sets `YOUTUBE_TRANSPORT=egress-agent`; it never gets `NET_ADMIN` and never joins the tunnel, because a rootless pod cannot create the interface and `NET_ADMIN` would trade every container rule for one routing rule. A leak is impossible for ordinary traffic rather than unlikely, because the namespace has nowhere else to send a packet. yt-dlp is also forced to IPv4 so a v6 lookup cannot be counted as an exit failure.

The agent is stateless and policy-free. It owns the namespace, the pool, the loaded config, the child processes and the socket; the server owns the database, the media root, the remux, the duration probe, the thumbnails and the rotation policy, because two owners of one decision is how a rotation loop starts. The socket is `/run/playliberty/egress-agent.sock`, `0600`, in a directory owned by the pod's uid, and the agent requires the configured peer uid, because the kernel's credential is a stronger check than a loopback port anything on the host can reach. There is no host port and no published listener.

The pool is `/etc/playliberty/proton`, root-owned with `0700` on the directory and `0600` on each `NN-<slug>.conf`. It is never committed, copied into an image or stored in a Podman secret. The build command reads it, runs `wg-quick strip` and the agent's `--dry-run`, and never writes it. The loaded name is `/var/lib/playliberty-egress/active`; the unit's up script reads it before the agent starts, so a reboot returns to the config the host had instead of the first file in the pool.

The host yt-dlp is the server image's binary, copied out by `pnpm deploy:build-for-production` and verified against the image's `org.playliberty.ytdlp.sha256` label. There is no second yt-dlp version or digest to drift from the Containerfile. The runbook is [`docs/runbooks/egress-agent.md`](runbooks/egress-agent.md).

### Audio is stored as-is, never transcoded

Downloads prefer the AAC stream, stored in an M4A container at about 128 kbps and seekable from the first byte, and it is served verbatim as `Content-Type: audio/mp4`. A video with no AAC stream is stored as the Opus stream YouTube does offer rather than refused, because the alternative to a playable file in the wrong container is no file at all; the caveat is that Safari and some mobile players cannot be relied on to play Opus. The server runs no encoder and keeps no transcode cache, so the stored stream is effectively the playback contract.

### Images are normalised once, on the server

Audio is served verbatim; images are the one kind of media the server re-encodes. A custom playlist cover must decode as JPEG, PNG or WebP, be at most 5 MB, and stay within the 64-megapixel decompression bound; `sharp` auto-orients it, crops the chosen square, caps its long edge at 1600px without enlarging, strips metadata, and writes WebP under `covers/`. Every new upload is stored square: the browser sends the visible square as four fractions, and an upload without them uses the centered square. The uncropped original is not kept; covers stored before this rule keep the aspect they were stored with. The file is immutable and versioned: an upload writes the new file before the row commits, and the previous file is deleted only after the new row commits. The playlist row keeps the server-only path and the `coverUpdatedAt` version; the contract carries the version and never the path, so a replacement is a new URL and a new cache key. The cover media route resolves the playlist at the read need and serves the file with the private media cache. The browser validates the type and size, previews the selection and sends the crop fractions, but the body stays the original bytes, because a direct API call can bypass every client check. This is an image pipeline beside the audio rule above, which still forbids audio transcoding.

### Identity comes from Pangolin's forwarded headers

The server takes the account from the `Remote-User`, `Remote-Email`, `Remote-Name`, and `Remote-Role` headers the edge injects, auto-provisions an account on first sight, and fails closed when the headers are absent. The app runs no login and stores no password; the admin list is the optional `pangolin_admin_user` secret, whose values match exact `Remote-User` values. Because reachability alone proved too implicit a guarantee, the origin also requires the edge to inject a secret `X-PlayLiberty-Edge` assertion on every request it proxies and refuses one without it, even a request carrying `Remote-*`; every process outside the test harness refuses to start when the assertion is not configured, and the bind defaults to loopback, with a non-loopback address requiring the explicit `ALLOW_NON_LOOPBACK_BIND` opt-in. The network rule stays as the second layer.

### The server stack

One Node 26 process built with Fastify 5 and compiled by `tsc`, owning a local SQLite database through `better-sqlite3` and Drizzle ORM, with `drizzle-kit` migrations committed and applied at startup. It depends on `packages/contracts`, the Zod schemas that define the `/api/v1` REST surface, and `packages/youtube`, the only module allowed to invoke yt-dlp. Streaming authorizes the request and delegates byte ranges to `@fastify/static`. Downloads and the weekly prune run in the same process, using the `track` rows as the queue; one process means SQLite is sufficient and no job claiming between workers is needed.

### The web stack

`apps/web` is a client-only single-page application: React 19.3 with the React Compiler enabled, built by Vite 8 (Rolldown) with TypeScript 6, routed by TanStack Router, server state in TanStack Query v5, the player and queue in a Zustand 5 store, styling SCSS with CSS Modules and BEM over CSS custom-property design tokens, dark only. Playback is a single global HTML5 audio element with the Media Session API, and the queue and position persist in `sessionStorage`. A dedicated nginx container is the single public origin: it serves the built assets and reverse-proxies `/api` and `/healthz`, so the browser sees one origin and no CORS is needed.

### The mobile stack

`apps/mobile` is an Expo SDK 57 React Native app (React Native 0.86.3, React 19.3, New Architecture) written in TypeScript, consuming `packages/contracts` directly. Navigation is Expo Router; server state is TanStack Query; the player and queue use Zustand plus `expo-audio` for background playback, lock-screen controls, and the queue. Styling is React Native `StyleSheet` over the typed token module from `packages/tokens`, dark only. The credential record, the access pair and the refresh token, lives in `expo-secure-store`; the access token renews silently before its deadline. Distribution in v1 is the signed, sideloaded Android APK; [the Android release runbook](runbooks/android-release.md) owns the procedure. The code stays cross-platform but iOS is not built or tested.

### A sheet body is the only scroller

React Native warns when a `FlatList` sits inside a plain `ScrollView` with the same orientation. The development overlay then covers the sheet and intercepts touches, so the rows cannot be pressed and the journeys fail. The shared `Sheet` owns the body scroll, so a sheet body cannot hold a virtualized list. The add-track picker and the share account picker map their rows inside the body scroll. A sheet that must virtualize needs the `Sheet` body to stop scrolling and one list to become the body, with its own bounded height.

### Mobile provisioning

The mobile client authenticates with a per-user Pangolin resource access token, obtained through the browser flow in [Mobile access, end to end](#mobile-access-end-to-end): PKCE, a single-use 60-second code, and the two edge-exempt endpoints in [the Pangolin edge runbook](../deploy/pangolin/README.md#the-bypass-rules). The exchange answers a short access token and a rotating refresh token; the access token is renewed silently at refresh, and the server stores only the refresh token's hash. The refresh token never travels in a URL; the redirect carries a single-use code bound by PKCE to the app instance. Sign-out and reuse revoke the family and every unexpired access token at the edge. On iOS `ASWebAuthenticationSession` guarantees the callback reaches only the calling app; on Android in Expo SDK 57 there is no equivalent guarantee, so the safety rests on the code plus PKCE, trying a verified HTTPS App Link first and falling back to a reverse-DNS custom scheme.

### Mutating requests carry a client header and pass origin checks

Every `POST`, `PUT`, `PATCH`, and `DELETE` must carry the `X-PlayLiberty-Client` header, and the server rejects any request without it. State is never mutated by `GET`. On top of the required header, the server checks `Origin` and `Sec-Fetch-Site` and denies cross-site non-safe requests. A non-safelisted custom header cannot be set by a cross-site form, and a cross-origin script that tries to set it triggers a CORS preflight the origin never approves; `SameSite` on the edge cookie is defense in depth rather than the main control, and XSS defeats any CSRF defense, which is why the controls are layered.

### The server's folder boundaries

The four folders are a dependency order, not a naming convention; the rules and their enforcement are in [Layer boundaries](#layer-boundaries-normative). The split exists because the rule for who may reach a playlist had been written three times in three feature folders.

### Adding a video is one batch request

Adding a manually chosen video is one top-level request, `POST /tracks`, whose body carries the video URL and a non-empty list of at most one hundred playlist ids, and whose response carries one outcome per chosen playlist, in the order the ids were sent: `added`, `already_present`, or `refused`, where `refused` carries no reason. The result is a list rather than one status code because a single code cannot say "four added, one already had it, one refused". `already_present` is a success, because it is the end state the user asked for. `refused` carries no reason because a playlist the account cannot see and a playlist it cannot write must be indistinguishable, so the batch cannot be used to learn which playlist ids exist. The stubbed `POST /playlists/:id/tracks` is removed rather than kept beside it.

### Live updates use Server-Sent Events

The web client keeps its screens current with one long-lived `GET /api/v1/events` that answers `text/event-stream`. The server pushes an event when server state changes: a sync run starts or settles, a track moves through the download states, a playlist is renamed or deleted, a track is added, removed or retried, a share is granted or revoked. An event is an invalidation hint and never data: it names what changed, and the client refetches the reads it already owns through TanStack Query. A heartbeat keeps the connection open, the client re-reads every query when the stream opens or reopens, and there is no polling interval anywhere. The transport is Server-Sent Events rather than a WebSocket because the need is one-way: `EventSource` reconnects on its own, the request is a `GET` so the client header does not apply, and no second protocol has to be built, secured and tested. The client owns the reconnect from a backoff timer rather than leaving it to `EventSource`, so a session the edge keeps refusing stops retrying instead of being retried on the browser's fixed schedule.
