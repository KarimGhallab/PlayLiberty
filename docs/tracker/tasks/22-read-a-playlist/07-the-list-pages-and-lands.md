# 07: The list pages and lands

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-track-rows-draw-and-play.md)

## What to build

The tracks read is an infinite read. The next offset is the loaded count; a page appends when the list nears its
bottom, with no Load more control. The loaded pages flatten into the one list the rows draw, and the first page's
counts stay the whole-playlist counts.

Opening the detail while this playlist is the queue lands on the current row. If the row is beyond the loaded pages,
the list loads pages until it exists, then scrolls it into view once. The landing is not repeated on every render.

The list pays the add action's height, and later the player bar's, as bottom padding so the last row is reachable.

## Acceptance criteria

- [ ] The next page appends near the bottom and stops at the total.
- [ ] No Load more control is drawn.
- [ ] Opening the queue's playlist loads pages until the current row exists and scrolls it into view once.
- [ ] The last row is reachable above the add action and the player bar.
- [ ] The loading and ending states render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the list's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
