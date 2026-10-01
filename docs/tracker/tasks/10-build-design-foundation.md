# Build the token and UI foundation packages

Status: resolved
Labels: `enhancement`

## Objective

Turn the designed token set and the shared UI decisions into the two workspace packages both clients consume, so a duration, a state label, and a color resolve identically on web and on mobile. This is the ticket that makes the design usable from code.

## Context

Read `docs/adr/0009-design-system-token-layer.md` and the reworked `docs/DESIGN.md` first, then `packages/utils` for the package shape and the tsc-only build, the TypeScript guideline, and `scripts/validate-tsconfig-paths.cjs`.

The token values come from task `09` and are not chosen here. The emitter mechanics come from task `08` and are not re-litigated here.

The workspace builds with plain `tsc` and has no script runner, so the emitter must not require one.

## Scope

### `packages/tokens`

- The designed values as the single source of truth, held as literal-typed data, with lengths as unitless numbers.
- A `types.ts` next to the values holding the group contracts, so consumers import types from there and never from the implementation.
- The emitter: appends `px` to lengths, `ms` to durations, passes colors through verbatim, wraps an easing curve's four numbers in `cubic-bezier(...)` for the stylesheet, and writes that into `dist`. The curve is a fourth kind of value rather than a variant of the first three, so the emitter needs a case for it. `packages/ui-foundation` exposes the matching mapping to React Native's `Easing.bezier`, which takes four numbers as arguments and not a string, so the shared source speaks the numbers and neither client ever sees the CSS syntax.
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

Components, views, routes, and any color or spacing decision, all of which belong to tasks `09`, `05`, and `06`.

## Blocking edges

Blocked by `09-design-scheme-and-components`, which produces the values this package holds.

## Verification

- `pnpm run build`, `pnpm run lint`, `pnpm run format`, and `pnpm run test` pass.
- `npx depcruise .`, `npx syncpack lint`, and `node ./scripts/validate-tsconfig-paths.cjs` pass.
- The leaf-value parity test passes, so no designed value is missing from the emitted stylesheet.
- The emitted stylesheet imports cleanly into a consumer, and the module resolves for the mobile bundler. Both are checked here rather than left for the scaffolds to find.
- `pnpm run script:unused-code` does not report the emitter.

## Outcome

Both packages exist, build, lint, and test. `packages/tokens` holds the 63 designed values as
literal-typed data grouped by kind, a `types.ts` with the contracts, and an emitter the package builds
for itself. `packages/ui-foundation` holds the non-rendering UI decisions. Nothing is committed from
`dist`, which stays gitignored.

**`packages/tokens`.** The values are `Token` objects discriminated by `TokenKind`, grouped as `colors`,
`lengths`, `durations`, `numbers`, `families` and `curves` (63 leaves: 19 colours, 28 lengths, 3
durations, 11 numbers, 1 family, 1 curve). A length is a unitless number, a duration a number of
milliseconds, the family the bare name `IBM Plex Sans`, and the curve its four control numbers. The
build is `clean` then `tsc` then `node dist/emitTokens.js`, so the emitter ships as the package's own
output and needs no new dependency and no runner. The emitter is the only place CSS syntax is added: `px`
to a length, `ms` to a duration, single quotes around the family, `cubic-bezier(...)` around the four
curve numbers, and a colour or bare number verbatim. It writes `dist/tokens.css` with a generated
header and one comment per group. The export map exposes `.` (`dist/index.js` plus its types) for the
mobile client and `./tokens.css` (`dist/tokens.css`) for the web client.

**The morph is in the package.** ADR 0009's generated-geometry amendment, ADR 0010's second pass and
`docs/design/README.md` all assign the play to pause frame table to `packages/tokens`, and no other
ticket owns it, so it was transcribed from `docs/design/generated/play-pause-morph.json` beside the
constants: the eight frames, the two pinned endpoints, the frame count, the strip travel and the pin.
Its duration is carried as `durationMs`, read from the `motion-base` token rather than repeated, and
since it is geometry a client draws rather than a custom property it is exported from the module and is
not in the stylesheet. `docs/design/README.md` still writes the JSON on `pnpm run design:morph:json`,
and the parity test holds the package to it.

**The parity test.** `emitTokens.test.ts` parses the emitted stylesheet and asserts its declaration names
are exactly the source's, and that each declaration equals the value rendered from the source, so a
value missing from the stylesheet or an extra one fails the run. It also asserts the export map and that
`dist/index.js` and `dist/tokens.css` exist at the paths the map names, and self-references
`@playliberty/tokens` and `@playliberty/tokens/tokens.css` so both the mobile client's resolver and the
web client's subpath are checked here rather than left to the scaffolds.
`morph.test.ts` compares the packaged table, endpoints, strip travel, pin and frame count to the
generated JSON field by field. The ADR calls parity between the design stylesheet and the package a
test; a permanent one would fail the first time a value changes in the package, which the same ADR says
is the only place a value is changed, so the ticket's source to stylesheet test is the one that ships
and the transcription itself was reviewed as a diff.

**`packages/ui-foundation`.** No DOM types and no rendering. `formatDuration` is `M:SS` below an hour
and `H:MM:SS` above it, with the minute padded only above the hour, matching the specimens' `4:18` and
`1:12`. `formatRelativeTime` is the ladder `just now`, minutes, hours, `yesterday`, days, weeks, months
and years; a future timestamp reads `just now` so clock skew cannot show a negative age. `formatLastSynced`
is that phrase behind `Synced `, or `Never synced` while the timestamp is null. `formatTrackCount` and
`trackCountUnit` pluralise at one and add no thousands separator, because the specimens draw `1284
tracks`. `TrackTone` is the six-tone vocabulary and `trackTone(fileStatus, sourceStatus)` maps the two
contracts enums to it, with `TrackSourceStatus.Removed` winning over any file status, which is the
precedence task `09` assigned here. `standardEasingBezier` is the curve's four numbers in the order
`Easing.bezier` takes them, so the mobile client spreads it and no client parses CSS. Unit tests pin
every string, all five file statuses, the removed precedence, and the curve.

**The runtime question was answered rather than deferred.** Hermes, the engine an Android React Native
app runs on, implements `Intl.NumberFormat` by proxying the platform's ICU rather than bundling one, so
its output varies with the Android version and locale, and it does not provide `Intl.RelativeTimeFormat`
at all (its Intl documentation lists neither it nor a polyfill). Both formatters are therefore
hand-rolled, which also makes the pinned strings the only ones either client can produce.

**Repo wiring.** Both packages are in `tsconfig.depcruise.json`, a root `tokens:build`/`tokens:watch`
and `ui-foundation:build`/`ui-foundation:watch` pair were added, `knip.json` enters
`packages/tokens/src/emitTokens.ts` so the run does not report the emitter, and `syncpack lint` is clean
because every version matches the workspace. `packages/ui-foundation` depends on
`@playliberty/contracts` for the two status enums and on `@playliberty/tokens` for the curve. Each
package also splits its project: `tsconfig.json` includes the tests with `noEmit` and keeps `outDir`
so a tool can map `dist` back to `src`, and `tsconfig.build.json` excludes the tests and is what the
build and watch run. Excluding the tests from the only config left the editor compiling them in an
inferred project with no `types: ["node"]`, which reported every `node:*` import in
`emitTokens.test.ts` and `morph.test.ts` as an error; the server's tests only escaped it because a
package they import pulls `@types/node` in transitively.

**Two documents were brought in line**, because task `10` falsifies what they said: `docs/DESIGN.md` and
`docs/design/README.md` now say `packages/tokens` is the source and `docs/design/tokens.css` is the
dated snapshot the values were transcribed from, where both previously said the snapshot wins.

Verification, all run:

- `pnpm run build`, `pnpm run lint`, `pnpm run format` and `pnpm run test` pass; the new tests are 3 in
  `packages/tokens` and 14 in `packages/ui-foundation`, and the full suite is 90.
- `npx depcruise .` reports no violations (82 modules), `npx syncpack lint` finds no issues, and
  `node ./scripts/validate-tsconfig-paths.cjs` is valid.
- The stylesheet carries all 63 declarations, and the emitted values are identical to
  `docs/design/tokens.css` after normalisation.
- `pnpm run script:unused-code` does not report the emitter. Its remaining output is the pre-existing
  server and design-script findings, unchanged.
- `pnpm run design:check` still passes, so the document edits broke no link or quoted ratio.
