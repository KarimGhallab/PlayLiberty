# Build the token and UI foundation packages

Status: resolved
Labels: `enhancement`

## Outcome

`packages/tokens` holds the 63 literal-typed values grouped by kind with a self-built emitter writing `dist/tokens.css`, plus the play-to-pause morph table exported from the module. `packages/ui-foundation` holds duration, relative-time and count formatting and the track-state tone mapping. A parity test holds the emitted stylesheet to the source; a morph test held the packaged table to the generated JSON until the design system was retired (see [`47-retire-the-design-system-and-specimens`](../issues/47-retire-the-design-system-and-specimens.md)). The values follow the principle of sharing values and decisions, not components, and the icons come from Tabler pinned to one version.

## Verification

Build, lint, format, test, depcruise, syncpack and the tsconfig path check pass; the parity test proves no designed value is missing from the emitted stylesheet.
