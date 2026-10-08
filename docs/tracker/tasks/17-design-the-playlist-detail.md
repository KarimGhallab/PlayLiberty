# Design the playlist detail screen

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

The playlist detail is drawn on web and mobile in `docs/design/screens/playlist-detail.html` and recorded at [`playlist-detail.md`](../../design-system/screens/playlist-detail.md). The header's identity block got its own record at [`playlist-header.md`](../../design-system/components/playlist-header.md), and [`header-transport.md`](../../design-system/components/header-transport.md) now states its figures as 1056px ones with the phone's beside them. Three faults in components the screen did not draw are written up in the record, two of them the same selector-collision mistake. The record owns the design; this ticket owns only how it was reached.

## Verification

`pnpm run design:check` passes; both arrangements carry attributed measurements and a specimen.
