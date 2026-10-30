# 08: The sort and the chips

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`06`](06-the-header-plays-and-shuffles.md), [`07`](07-the-list-pages-and-lands.md)

## What to build

The sort and the status chips sit in a band that sticks under the top inset while the identity block and the rows
scroll under it.

The sort is a sheet with three radios: Playlist order, Newest first and Oldest first. It writes the playlist's saved
sort, applies optimistically and asks the playlist reads again because the order moved. A refusal is a notice and the
control returns to the saved value. A read collaborator sees the control disabled. The control is disabled while the
list is shuffled.

The chips are All and the five file states with the whole-playlist counts. They take the full width and wrap. A chip
filters the list read by state; the counts do not follow the filter; the total and paging stay honest under it. A
filter with no rows names the state and offers Show all. Both controls are disabled while the list is shuffled. The
filter is client state for the visit and clears when the screen is left. The filter never changes what Play or
Shuffle starts.

## Acceptance criteria

- [ ] The sort sheet writes one of the three values, applies it optimistically and asks the playlist reads again.
- [ ] A refused sort is a notice and the control returns to the saved value.
- [ ] The chips filter the list read by state and their counts stay the whole-playlist counts.
- [ ] A filter with no rows names the state and offers Show all, which returns the whole list.
- [ ] The sort is disabled for a read collaborator; both controls are disabled while the list is shuffled.
- [ ] The filter clears when the screen is left and never changes what Play or Shuffle starts.
- [ ] The band sticks under the top inset while the list scrolls.
- [ ] The sort sheet, the chips and the filter-empty state render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the detail's Jest file, then `pnpm run build` and
`pnpm run lint:check`.
