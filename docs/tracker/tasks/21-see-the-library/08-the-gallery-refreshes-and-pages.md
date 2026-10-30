# 08: The gallery refreshes and pages

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md), [`04`](04-the-scope-and-the-status-chips.md)

## What to build

The grid refreshes when pulled down, and it appends the next page when the last row is near, with no Load more control. The first read requests the route's maximum page, so the scope and chip counts are whole up to that size; later pages append beyond it and the counts follow the loaded pages. The optimistic pin and the deferred delete work across pages.

## Acceptance criteria

- [ ] Pulling the grid down refetches the gallery and its counts.
- [ ] The next page appends when the last row is near, with no Load more control.
- [ ] A library larger than the first page pages correctly.
- [ ] The counts follow the loaded pages.
- [ ] The optimistic pin and the deferred delete work across pages.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`.
