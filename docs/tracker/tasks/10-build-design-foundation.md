# Build the token and UI foundation packages

Status: open
Labels: `enhancement`, `ready-for-agent`

## Objective

Turn the designed token set and the shared UI decisions into the two workspace packages both clients consume, so a duration, a state label, and a colour resolve identically on web and on mobile. This is the ticket that makes the design usable from code.

## Context

Read `docs/adr/0009-design-system-token-layer.md` and the reworked `docs/DESIGN.md` first, then `packages/utils` for the package shape and the tsc-only build, the TypeScript guideline, and `scripts/validate-tsconfig-paths.cjs`.

The token values come from task `09` and are not chosen here. The emitter mechanics come from task `08` and are not re-litigated here.

The workspace builds with plain `tsc` and has no script runner, so the emitter must not require one.

## Scope

### `packages/tokens`

- The designed values as the single source of truth, held as literal-typed data, with lengths as unitless numbers.
- A `types.ts` next to the values holding the group contracts, so consumers import types from there and never from the implementation.
- The emitter: appends `px` to lengths, `ms` to durations, passes colours through verbatim, and writes the stylesheet into `dist`.
- A build of clean, compile, then run the compiled emitter, so the emitter ships as part of the package's own output and needs no new dependency and no runner.
- An export map exposing both the stylesheet subpath for web and the module for mobile.
- A test asserting that every leaf value in the source appears in the emitted stylesheet.

### `packages/ui-foundation`

- Duration formatting, including the over-an-hour case.
- Relative time from a last-synced timestamp, and track counts with correct pluralisation.
- The tone vocabulary and the mapping from a track's file status and source status to a tone.
- Free functions, React Native safe, no DOM types, no rendering, and no dependency on the tokens package beyond the values it formats.
- Unit tests pinning the exact output strings, since these strings are the contract both clients render.
- Verify what the runtime can actually do: check whether the engine used on Android provides the internationalisation APIs relative time and number formatting rely on, and hand-roll both formatters if it does not. Do not discover this in task `06`.

### Repo wiring

- Paths in `tsconfig.depcruise.json` for both packages, without which the path validator fails.
- Root scripts for building and watching them.
- A `knip` entry for the emitter, which nothing imports and which the unused-code script would otherwise flag.
- Versions aligned with the rest of the workspace by `syncpack`.

## Out of scope

Components, views, routes, and any colour or spacing decision, all of which belong to tasks `09`, `05`, and `06`.

## Blocking edges

Blocked by `09-design-scheme-and-components`, which produces the values this package holds.

## Verification

- `pnpm run build`, `pnpm run lint`, `pnpm run format`, and `pnpm run test` pass.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- The leaf-value parity test passes, so no designed value is missing from the emitted stylesheet.
- The emitted stylesheet imports cleanly into a consumer, and the module resolves for the mobile bundler. Both are checked here rather than left for the scaffolds to find.
- `pnpm run script:unused-code` does not report the emitter.
