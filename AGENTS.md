# PlayLiberty

PlayLiberty is an audio player for web and mobile that syncs YouTube playlists and keeps them saved, so a removed video never removes a track from a user's playlist. It is a self-hosted private multi-user service, deployed behind the Pangolin authenticating edge. The server side will own accounts, playlists, the media store, and sync; the clients present and stream that media.

## Read first if needed

- `docs/PRODUCT.md` - product intent, users, constraints, principles.
- `docs/GLOSSARY.md` - the project's vocabulary. Read it before naming a domain concept.
- `docs/DOMAIN.md` - where the product and architecture docs live, and how to consume them.
- `docs/ARCHITECTURE.md` - components, layer boundaries, and where things live.
- `docs/DESIGN.md` - the design system for the web and mobile surfaces: the index, the
  cross-cutting rules, and the map into `docs/design-system/`, which holds one file per
  subject and the reasoning behind each.
- `docs/adr/` - architecture decision records.
- `docs/tracker/` - AI work tracking: issues, specs, tasks.

## Orientation

The components, the layer boundaries and where things live are owned by `docs/ARCHITECTURE.md`; read it
before changing one. The repo is a pnpm workspaces monorepo. Workspace packages are scoped `@playliberty/*`
and consumed with `workspace:*`.

## Guardrails

- Do not commit or push unless explicitly asked; the human owns git history.
- ESM everywhere (`"type": "module"`). The runtime is pinned in `mise.toml` (Node 26.5.0) and the package manager in `package.json` (`pnpm@12.4.2`); do not drift them.
- Deployment is private, behind the Pangolin authenticating edge. A production origin must never publish a host port and must join the `pangolin_frontend` network declared `external`. See `docs/ARCHITECTURE.md` and the deployment guideline.
- No transcoding, ever. The stored AAC/M4A is served verbatim. See `docs/ARCHITECTURE.md`.
- Identity comes from Pangolin's forwarded `Remote-*` headers and fails closed when they are absent. See `docs/ARCHITECTURE.md`.
- Never use em dashes in generated text.
- After a change, run `pnpm run build` and `pnpm run lint`. Do not run prettier or format. The pre-commit hook already runs lint-staged, syncpack, and dependency-cruiser; do not run those by hand.
- Apps are leaves: never import an app from a package (enforced by the `no-apps-import` dependency-cruiser rule).
- A test earns its place only if it fails when behavior a user relies on changes, with one owner test per behavior plus at most one assembly test. See the testing guideline (`~/.config/opencode/refs/guidelines/testing.md`).

## Agent skills

### Issue tracker

Work is tracked as local markdown under `docs/tracker/`. The board and the tracker conventions are `docs/tracker/issues/ISSUES_TRACKER.md`.

### Triage labels

The five canonical state roles plus `bug` and `enhancement`. See `docs/TRIAGE_LABEL.md`.

### Domain docs

Single-context layout: product intent, glossary, architecture, and decisions. See `docs/DOMAIN.md`.
