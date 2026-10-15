# 02: The detail's sort control

**Blocked by:** [`01`](01-the-saved-sort-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. The detail's tracks column gained a control row above the list, holding
`PlaylistSortControl`: a menu button at the row's end that draws the order the playlist is read in and opens the
three orders. The lead space is left for ticket `05`'s filter chips, which join the row later.

The control is presentational and the page owns the write, exactly as the skip setting does. `useUpdateSort`
saves the order optimistically (the playlist's own value moves at once and a failure puts it back), answers the
updated playlist, and invalidates the playlist-scoped reads, because the saved order is the order the list and
the queue are read in. A refusal reuses the page's setting notice.

The control is disabled while the queue is this playlist and shuffled, and for a read collaborator, whose value
it still is to read. The menu never opens while disabled.

The design came from a throwaway prototype, which is deleted: the `/prototype/sort-row` route, the variant
components and the `PrototypeSwitcher` are gone, and the catalog lint override with them. What was folded in is
the winner: the button is quiet at rest (no box, the order and its two marks at `--muted`, coming up to `--ink`
together on hover), the 2px accent rule the segmented control marks its choice with is drawn under it only while
the menu is open, the chevron turns over, and the menu arrives in one rise with its entries settling in behind
it. `prefers-reduced-motion` drops the motion.

The copy is new keys under the detail namespace, in both catalogs: `sortBy`, `sortPlaylist`, `sortNewest`,
`sortOldest`.

The tests: `PlaylistSortControl.test.tsx` proves the order it draws, the menu's selection, the order it asks
for on a press, that picking the order already in force asks for nothing, and the three reasons it is disabled,
with an axe pass. The detail page gained a describe proving the chosen order is saved and the list draws it, the
control is disabled while the shuffled list is on screen, and a read collaborator sees it disabled. The mock
handlers gained the sort write.

Verification: `pnpm test:unit` (web 407, server 354, packages 79), `pnpm run build`, `pnpm run lint`, the e2e
typecheck, `design:check` and prettier pass, and the Impeccable detector reports nothing on the changed UI. No
em dashes. Not committed.
