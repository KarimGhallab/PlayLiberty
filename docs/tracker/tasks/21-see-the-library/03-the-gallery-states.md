# 03: The gallery's three other states

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md)

## What to build

The gallery's non-list states. A pending read draws a grid of skeleton cards, not an empty gallery. A failed read draws the read-failure body with the problem's title and a retry that refetches the gallery. A successful read with no playlists draws the empty gallery with its heading, its promise and one labelled action. The action's callback is supplied by the route; the add sheet that answers it lands in `05`.

## Acceptance criteria

- [ ] A pending read draws the skeleton grid, not the empty gallery.
- [ ] A failed read draws the failure body with the problem's title and a retry, never the empty gallery.
- [ ] A successful empty read draws the empty gallery and its one labelled action.
- [ ] The retry refetches the gallery.
- [ ] The empty action calls the route's add callback.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`.
