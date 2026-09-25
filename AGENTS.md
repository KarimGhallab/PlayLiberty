# PlayLiberty

PlayLiberty is an audio player for web and mobile that syncs YouTube playlists and keeps them saved, so a removed video never removes a track from the user's library. It is a self-hosted personal service, deployed behind the Pangolin authenticating edge. The server side will own the synced library and sync state; the clients present and play that library.

## Read first

- `docs/PRODUCT.md` - product intent, users, constraints, principles.
- `docs/GLOSSARY.md` - the project's vocabulary. Read it before naming a domain concept.
- `docs/DOMAIN.md` - where the product and architecture docs live, and how to consume them.
- `docs/ARCHITECTURE.md` - components, layer boundaries, and where things live.
- `docs/DESIGN.md` - the design system for the web and mobile surfaces.
- `docs/adr/` - architecture decision records.
- `docs/tracker/` - AI work tracking: issues, specs, tasks.

## Orientation

- `apps/console` - runnable Node entry point. The only app today, a thin harness while the player surfaces are built.
- `packages/utils` - shared TypeScript utility library (paths, collections, functions, async helpers).
- `docs/tracker/` - work tracking: issues, specs, tasks.

The repo is a pnpm workspaces monorepo. Workspace packages are scoped `@playliberty/*` and consumed with `workspace:*`.

## Guardrails

- Do not commit or push unless explicitly asked; the human owns git history.
- ESM everywhere (`"type": "module"`). The runtime is pinned in `mise.toml` (Node 26.5.0) and the package manager in `package.json` (`pnpm@12.4.2`); do not drift them.
- Deployment is private, behind the Pangolin authenticating edge. A production origin must never publish a host port and must join the `pangolin_frontend` network declared `external`. See `docs/adr/0001-private-deployment-behind-pangolin-edge.md` and the deployment guideline.
- Never use em dashes in generated text.
- After a change, run `pnpm run build` and `pnpm run lint`. The pre-commit hook already runs lint-staged, syncpack, and dependency-cruiser; do not run those by hand.
- Apps are leaves: never import an app from a package (enforced by the `no-apps-import` dependency-cruiser rule).

## Agent skills

### Issue tracker

Work is tracked as local markdown under `docs/tracker/`. The board and the tracker conventions are `docs/tracker/issues/ISSUES_TRACKER.md`.

### Triage labels

The five canonical state roles plus `bug` and `enhancement`. See `docs/TRIAGE_LABEL.md`.

### Domain docs

Single-context layout: product intent, glossary, architecture, and ADRs. See `docs/DOMAIN.md`.
