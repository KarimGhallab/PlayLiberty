# Design the library screen

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

The library is drawn at both widths in `docs/design/screens/library.html` and recorded at [`library.md`](../../design-system/screens/library.md), with rows in [`DESIGN.md`](../../DESIGN.md) and two new component records, [`empty-shelf`](../../design-system/components/empty-shelf.md) and [`add-playlist-dialog`](../../design-system/components/add-playlist-dialog.md). The item is the playlist header, and [`player-bar.md`](../../design-system/components/player-bar.md) is corrected to say the bar is absent at rest. Two gate checks were added, both proved by putting the fault back. The record owns the design; this ticket owns only how it was reached.

## Verification

`pnpm run design:check` passes; the two new checks were proved by reinstating the fault they catch.
