# 05: The detail's chip row

**Blocked by:** [`02`](02-the-detail-sort-control.md) and [`04`](04-the-counts-and-the-state-filter.md).
**Status:** resolved

## Outcome

Implemented and verified. The detail's control row above the list now carries two controls: the filter chips in
the lead and the sort at the end. The row itself moved to the screen's own `playlist-detail__controls`, since it
is the layout that holds both, and `PlaylistSortControl` is the sort alone now.

`PlaylistFilterChips` is the new component: "All" then "Stored", "Pending", "Downloading", "Failed" and
"Unavailable", all five always drawn including a zero, with "All" carrying the playlist's total. One chip is in
force at a time, the chip already in force asks for nothing, and every chip is disabled while the shuffled
queue's order is the list on screen.

The filter is client state, held for the visit and cleared when the screen is left. It is passed to the tracks
read as the `state` query parameter, whose key now carries the state, so the read's own total is the filtered
total and the header's count line follows it through a new `countTotal`; with no filter the total is the
playlist's own count and nothing changes. The read keeps the previous state's rows while the new one loads,
because `usePlaylistTracks` asks with `keepPreviousData`, so narrowing the list does not blink it away. While
the shuffled queue is the list, the filter is not applied, so the list draws the whole shuffled queue; the
selection is kept for when the shuffle is turned off. Play and shuffle keep reading the whole playlist's queue,
so a filter changes what is seen and not what plays.

The chips are drawn from the whole-playlist counts the read folds in, so they never follow the filter: the point
of a count is what is available to filter to. A filter that matches nothing draws the named empty state ("No
failed tracks") with a "Show all" action, and the control row stays above it so the way back is reachable.

The copy adds `detail.filterBy`, `detail.filterAll`, `detail.filterShowAll` and the five `detail.filterEmpty.*`
sentences in both catalogs, and the stored chip adds `trackState.stored`, the one state word the row is silent
on; the other four chips reuse the row's own words.

The detail design's list section is amended with "The control row above the list", naming the row and its two
controls, and its count paragraph now says the total is the filtered total while a chip is in force.

The tests: `PlaylistFilterChips.test.tsx` proves every chip draws its whole-playlist count and All the total,
the one in force, the state a press asks for, that the chip in force asks for nothing, and that every chip is
disabled, with an axe pass. The detail page gained a describe proving the chips carry the whole-playlist
counts, a chip narrows the list and the header's count line and All restores both, a filter that matches
nothing draws the named empty state and its Show all restores the list, the chips are disabled while shuffled,
and a filter that matched nothing still plays every playable track. The mock handlers gained the counts and the
state filter.

Verification: `pnpm test:unit` (web 419, server 359, packages 79), `pnpm run build`, `pnpm run lint` and prettier
pass. No em dashes. Not committed.
