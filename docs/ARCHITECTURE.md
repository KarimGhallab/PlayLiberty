# Architecture

PlayLiberty is a pnpm workspaces monorepo built with TypeScript (`tsc`). Workspace packages are scoped `@playliberty/*` and consumed through `workspace:*` and the `tsconfig.depcruise.json` paths. Only a thin console app and a shared utility package exist today; the server and the web and mobile clients are planned.

## Components

### The applications

- `apps/console` - runnable Node entry point (`apps/console/src/main.ts`), a thin harness that exercises the packages while the player surfaces are built. ESM, built with `tsc` to `dist/`.
- `apps/server` (planned) - the service that owns sync and the library.
- `apps/web` (planned) - the browser client.
- `apps/mobile` (planned) - the mobile client.

### The packages

- `packages/utils` - shared TypeScript utilities: path handling, collections, function helpers (debounce, throttle), and small types. Built with `tsc`, emitting declarations to `dist/`.

### The stores

None yet. The intended shape is a local library store (media files plus an index keyed by YouTube video id) owned entirely by the server. Clients read the library through the server; they never own it. Until that exists, nothing is persisted.

### YouTube

The only external service. PlayLiberty reads playlist membership and video metadata from YouTube, and retrieves media for tracks it retains. All access must live in one dedicated package (planned), never scattered through apps, so the external dependency has a single seam.

## One operation, end to end (planned)

Walking a sync run as intended:

1. The client asks the server to sync a playlist (`apps/web` or `apps/mobile`).
2. The server reads the source playlist from YouTube through the YouTube access package.
3. The sync reconciles it with the library: new video ids are fetched and added, known ids are left alone, tracks whose source video is gone are retained.
4. The server records the sync run and its outcome.
5. The client refreshes its view from the library.

None of this is implemented yet. It is recorded here so the first implementation has a target, and so early tickets can be cut against it.

## Layer boundaries (normative)

- Packages must never import applications. Enforced by the `no-apps-import` rule in `.dependency-cruiser.cjs`.
- Cycles are forbidden (`no-circular`); orphan modules warn (`no-orphans`).
- Dependencies between workspace packages are declared with `workspace:*`, and their source paths are mirrored in `tsconfig.depcruise.json`. Add both when you add a package.
- The application and package scope is `@playliberty/*`.

## Where things live

- `apps/console/src/main.ts` - the console entry point.
- `packages/utils/src/` - utility sources, grouped by area (`utils/`, `types/`).
- `scripts/validate-tsconfig-paths.cjs` - keeps `tsconfig.depcruise.json` paths aligned with the workspace.
- `.dependency-cruiser.cjs` - layer and dependency rules, run on commit.
- `docs/` - product, domain, architecture, design, and decisions.

## Deployment shapes

- Local development: `pnpm install`, then `pnpm run build` or `pnpm run watch`; run the console with `pnpm run console:start`.
- Production: private, behind the Pangolin authenticating edge. The origin joins the `pangolin_frontend` network (declared `external`) and never publishes a host port, running as a `systemd --user` Quadlet unit. See `docs/adr/0001-private-deployment-behind-pangolin-edge.md` and the deployment guideline at `~/.config/opencode/refs/guidelines/deployment.md`. No container files exist yet.

## Decisions

Non-obvious choices are recorded as ADRs in `docs/adr/`. Read the one that touches what you are changing before you change it.
