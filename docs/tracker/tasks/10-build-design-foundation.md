# Build the token and UI foundation packages

Status: resolved
Labels: `enhancement`

## Outcome

`packages/tokens` holds the 63 literal-typed values grouped by kind with a self-built emitter writing `dist/tokens.css`, plus the play-to-pause morph table exported from the module. `packages/ui-foundation` holds duration, relative-time and count formatting and the track-state tone mapping. A parity test holds the emitted stylesheet to the source, and a morph test holds the packaged table to the generated JSON. See [`Sharing values and decisions, not components`](../../DESIGN.md#sharing-values-and-decisions-not-components) and [`Icons come from Tabler, pinned to one version`](../../DESIGN.md#icons-come-from-tabler-pinned-to-one-version).

## Verification

Build, lint, format, test, depcruise, syncpack and the tsconfig path check pass; the parity test proves no designed value is missing from the emitted stylesheet.
