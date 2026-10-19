# 72: The phone gallery card truncates the playlist name

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The card item draws the library's incomplete mark beside the count, not in the name row. The name row now holds only the name and the share mark, so the mark no longer sets the name's width; the mark still shows its count and breakdown on the card. The tile keeps the mark in its actions row and the row keeps its current placement.

A phone e2e test seeds a playlist named "Etoiles" with a failed download, waits for the badge, and measures the card's name link at 390: the name is not clipped by the mark.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 504); `pnpm test:e2e` is 36 passed.
