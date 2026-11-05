# 51: The e2e projects own their suites

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

`e2e/` is one workspace package that holds both suites. The mobile journeys live in `apps/mobile`: sixteen flows in `.maestro/`, a device-only flow in `.maestro-device/`, a runner in `scripts/`, a README, and an `e2e` script in its manifest. The mobile app therefore carries test assets next to its source, while the web app carries only its e2e environment file.

The mobile harness sits in `e2e/scripts/`, and the scenario contract is duplicated: the web suite owns the scenario type and the URL builders, and the mobile seed repeats the URL construction. The web and mobile run artifacts share the `e2e/` root.

## Expected

`e2e/` is a container with no package. It holds `web`, `mobile`, and `shared`, each a workspace package:

- `@playliberty/e2e-web` owns the Playwright config, the specs, the support modules, and the parallel runner.
- `@playliberty/e2e-mobile` owns the flows, the device-only flow, the harness shell, the seed, and the Maestro runner.
- `@playliberty/e2e-shared` owns the scenario contract and the playlist and video URL builders. It is source-only ESM with declarations, so neither suite gains a build step.

`apps/mobile` keeps only its environment files: the live-run values, the developer values, and the generated development override. Its Maestro folders, runner, README, and package script are gone.

The commands keep their names and argument behavior. The mobile harness still borrows the web origin as the Pangolin edge stand-in. The server's fake adapter stays independent of `e2e/`. Run artifacts move under the project that owns them.

## Evidence

The current layout is one `e2e` package, with the mobile flows and runner under `apps/mobile` and the mobile harness under `e2e/scripts`. The playlist and video URL builders are written in the web support module and again in the mobile seed. The target layout and boundaries were settled in the design grilling of 5 November 2026.

## Acceptance criteria

- [x] `e2e/` has no `package.json`; `e2e/web`, `e2e/mobile`, and `e2e/shared` are workspace packages with the names above.
- [x] The workspace includes `e2e/*`, and every root script, CI workflow, cache key, and filter names the new packages.
- [x] `e2e/web` holds the Playwright config, the twelve specs, the support modules, and the parallel runner; its scenario, database, media, results, and report directories live under it.
- [x] `e2e/mobile` holds the sixteen flows, the device-only flow, the harness shell, the seed, and the Maestro runner; its live and archived run directories live under it.
- [x] `apps/mobile` contains no e2e flow, runner, or script. Only the live-run values, the developer values, and the generated development override remain.
- [x] `e2e/shared` exports the scenario types and the playlist and video URL builders. The web support module and the mobile seed both consume it, and the server fake adapter stays independent.
- [x] The old mobile Maestro README is deleted.
- [x] The root command names and their single-flow argument forwarding are unchanged.
- [x] The mobile harness still starts the web origin as the edge stand-in.
- [x] `docs/ARCHITECTURE.md` names the three e2e projects; historical tracker tickets keep their old paths.
- [x] The web and mobile suites reach the same end state as before.

## Outcome

`e2e/` is a container with `web`, `mobile`, and `shared`. The web suite moved with its config, support, specs, and parallel runner, and its runtime state now lives under `e2e/web`. The mobile flows, device flow, harness, seed, and Maestro runner moved under `e2e/mobile`, and `apps/mobile` keeps only the environment files. `e2e/shared` owns the scenario contract and the URL builders, and both suites import it. The root commands, CI paths, workspace, ignore rules, and architecture note name the new packages. The mobile Maestro README was deleted.

## Verification

`pnpm install` linked the new workspace packages.

- `pnpm run test:e2e:typecheck`, `pnpm run build`, and `pnpm run lint:check` pass.
- `node --check` on the mobile scripts and `bash -n` on the harness shell pass.
- `pnpm test:e2e:web` passed all 47 tests.
- `pnpm mobile:e2e -- flows/library-and-account.yaml` passed. The first attempt after a cold Metro build landed on the dev client's server list; the immediate retry passed.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#where-things-live).
