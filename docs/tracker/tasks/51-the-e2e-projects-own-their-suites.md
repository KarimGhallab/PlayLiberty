# 51: The e2e projects own their suites

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`e2e/` is a container with `web`, `mobile`, and `shared`. The web suite moved with its config, support, specs, and parallel runner, and its runtime state now lives under `e2e/web`. The mobile flows, device flow, harness, seed, and Maestro runner moved under `e2e/mobile`, and `apps/mobile` keeps only the environment files. `e2e/shared` owns the scenario contract and the URL builders, and both suites import it. The root commands, CI paths, workspace, ignore rules, and architecture note name the new packages. The mobile Maestro README was deleted.

See [ARCHITECTURE.md](../../ARCHITECTURE.md#where-things-live).
