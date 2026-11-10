# PlayLiberty

PlayLiberty is an audio player for web and mobile that syncs YouTube playlists and keeps them saved, so a removed video never removes a track from a user's playlist. It is a self-hosted private multi-user service, deployed behind the Pangolin authenticating edge. The server owns accounts, playlists, the media store, and sync; both clients present and stream that media.

## Read first if needed

- `docs/PRODUCT.md` - product intent, users, constraints, principles.
- `docs/GLOSSARY.md` - the project's vocabulary. Read it before naming a domain concept.
- `docs/ARCHITECTURE.md` - components, layer boundaries, where things live, and the decisions.
- `docs/tracker/` - AI work tracking: issues, specs, tasks.

## Orientation

The components, the layer boundaries and where things live are owned by `docs/ARCHITECTURE.md`; read it
before changing one. The repo is a pnpm workspaces monorepo. Workspace packages are scoped `@playliberty/*`
and consumed with `workspace:*`.

## Guardrails

- Do not commit or push unless explicitly asked; the human owns git history.
- ESM everywhere (`"type": "module"`). The runtime is pinned in `mise.toml` (Node 26.5.0) and the package manager in `package.json` (`pnpm@12.15.0`); do not drift them.
- Deployment is private, behind the Pangolin authenticating edge. A production origin must never publish a host port and must join the `pangolin_frontend` network declared `external`. See `docs/ARCHITECTURE.md` and the deployment guideline.
- The YouTube egress is a system-scoped agent in its own network namespace. The pod never gets `NET_ADMIN`, never joins the tunnel, and reaches the agent only over its Unix socket. See `docs/ARCHITECTURE.md`; the host steps are in `docs/runbooks/egress-agent.md`.
- The production host is prepared by `pnpm deploy:build-for-production`; it builds images and prepares the host only. It never installs or starts the unit. See `docs/ARCHITECTURE.md`.
- No transcoding, ever. The stored AAC/M4A is served verbatim. See `docs/ARCHITECTURE.md`.
- Identity comes from Pangolin's forwarded `Remote-*` headers and fails closed when they are absent. See `docs/ARCHITECTURE.md`.
- Never use em dashes in generated text.
- After a change that affected the source code, run `pnpm run build` and `pnpm run lint:check`. The pre-commit hook already runs lint-staged, syncpack, and dependency-cruiser; do not run those by hand.
- Apps are leaves: never import an app from a package (enforced by the `no-apps-import` dependency-cruiser rule).
- A test earns its place only if it fails when behavior a user relies on changes, with one owner test per behavior plus at most one assembly test. See the testing guideline (`~/.config/opencode/refs/guidelines/testing.md`).

## Audits

### Mobile UI audit

The design detector is blind to `apps/mobile`. `impeccable detect --json apps/mobile/src apps/mobile/app` exits 0 with
an empty array over every file because the engine resolves markup and CSS, not JSX and React Native style objects; the
same colour and size values produce four findings as a CSS declaration and none as a `StyleSheet`. An empty result is
not a pass, and no issue may cite one as evidence about this client.

A mobile audit reads the device and the tokens instead:

| Check          | Command or file                                                                                                                                                                                                                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Touch targets  | `adb -s emulator-5554 shell uiautomator dump /sdcard/ui.xml >/dev/null && adb -s emulator-5554 shell cat /sdcard/ui.xml`; every `clickable="true"` node's `bounds` is at least 48dp, converted at `adb -s emulator-5554 shell wm density`. |
| Labels, roles  | The same dump: `content-desc` is the name; `class`, `checkable`, `checked` and `enabled` carry the role and the state.                                                                                                                     |
| Contrast       | `pnpm --filter @playliberty/mobile exec jest src/shared/styles/tokens.test.ts`; a pair it does not cover is computed from `packages/tokens/src/values.ts`.                                                                                 |
| Text scale     | `adb -s emulator-5554 shell settings put system font_scale 1.0`, then `1.3`, then `2.0`, reading every screen at each.                                                                                                                     |
| Reduced motion | `adb -s emulator-5554 shell settings put global transition_animation_scale 0`, restored to `1`.                                                                                                                                            |

## Agent skills

### Issue tracker

Work is tracked as local markdown under `docs/tracker/`. The board and the tracker conventions are `docs/tracker/issues/ISSUES_TRACKER.md`.

### Triage labels

The five canonical state roles plus `bug` and `enhancement`. See `docs/TRIAGE_LABEL.md`.
