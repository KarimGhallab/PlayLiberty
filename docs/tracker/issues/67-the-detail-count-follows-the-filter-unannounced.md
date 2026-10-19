# 67: The detail count follows the filter without saying so

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** On the playlist detail the identity card prints the read's own total, which the state filter has already narrowed, with no qualifier, so a filtered playlist reads as if it lost tracks while the chip rail beside it still carries the whole-playlist counts.

**Current behavior:**
`PlaylistDetailPage.tsx:370-371` passes `displayedCount` as the loaded row count and `countTotal` as the read's own total, which the `state` filter has already narrowed. `usePlaylistHeader.tsx:199-202` then takes `total = countTotal` and `shownCount = displayedCount`, so `partial` is false and the `countOf` sentence ("{shown} of {total}") cannot draw; the identity block prints the filtered figure alone. Filtering "Evening Jazz" to `Failed 1` makes the card read "1 track"; filtering to `Pending 0` makes it read "0 tracks", while the chip rail simultaneously reads "All 8".

This follows a recorded decision rather than an oversight: `docs/tracker/tasks/12-sort-and-filter-the-track-list/05-the-detail-chip-row.md` states that the read's own total is the filtered total and that "the header's count line follows it". The open question is whether an unqualified count on the playlist's own identity card can carry a filtered meaning without reading as the playlist's size.

**Desired behavior:**
Either the identity block keeps the playlist's own total and the filtered figure stays on the rail, or the count is qualified so the filtered meaning is explicit. Two unqualified numbers on one screen must not contradict.

**Key interfaces:**

- `usePlaylistHeader` keeps `countTotal`, `displayedCount` and `partial`; the change is which total the identity block is given and how it is phrased.
- The chip rail keeps the whole-playlist counts it already draws.

**Acceptance criteria:**

- [ ] The count on the identity card cannot be read as the playlist's own size while a filter is on.
- [ ] The rail's "All N" and the identity count never present two unqualified numbers that disagree.
- [ ] A test holds the filtered state.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The chip counts, which are already the whole playlist's.
- The named empty-filter state and its "Show all" action.
- Pagination's existing "x of y" path.

## Observed

- Filtering "Evening Jazz" to `Failed 1` reads "1 track"; to `Pending 0` reads "0 tracks".
- The chip rail on the same screen reads "All 8".
- `countTotal` is the filtered total, so the qualified path cannot trigger.

## Expected

- The identity count and the rail agree, or the count states that it is filtered.

## Evidence

- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:370-371`.
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:199-202,353-368`.
- `docs/tracker/tasks/12-sort-and-filter-the-track-list/05-the-detail-chip-row.md`.
- Impeccable critique of `apps/web`, 2026-10-16, priority issue P1.
