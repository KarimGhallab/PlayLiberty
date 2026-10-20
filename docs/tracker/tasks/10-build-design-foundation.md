# Build the token and UI foundation packages

**Status:** resolved
**Labels:** `enhancement`

## Outcome

`packages/tokens` holds the designed values grouped by kind, with a self-built emitter writing `dist/tokens.css` and the play-to-pause morph table exported from the module. `packages/ui-foundation` holds duration, relative-time and count formatting and the track-state tone mapping. A parity test holds the emitted stylesheet to the source; the morph parity test was retired with the design system.
