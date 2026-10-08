# Design the color scheme and components

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

The visual system is decided and drawn. `docs/design/tokens.css` holds the flat value set, twelve specimens under `docs/design/` link it, and the record is [`DESIGN.md`](../../DESIGN.md) plus one file per subject under [`docs/design-system/`](../../design-system/). Seven component specimens shipped, the sync summary and sync error among them, and the validator grew from six checks to twenty-two. [`10-build-design-foundation`](10-build-design-foundation.md) moved the values into the package.

## Verification

`pnpm run design:check` passes; every text pairing clears AA and every control boundary clears 3:1, computed rather than asserted.
