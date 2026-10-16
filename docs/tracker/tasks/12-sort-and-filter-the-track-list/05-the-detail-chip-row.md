# 05: The detail's chip row

**Status:** resolved

## Outcome

The detail's control row above the list, the screen's own `playlist-detail__controls`, carries the filter chips in the lead and the sort at the end, and `PlaylistSortControl` is the sort alone now. `PlaylistFilterChips` draws "All" (carrying the playlist's total) then "Stored", "Pending", "Downloading", "Failed" and "Unavailable", all five always drawn including a zero, one chip in force at a time, the chip already in force asking for nothing, and every chip disabled while the shuffled queue's order is the list on screen. The filter is client state held for the visit and cleared when the screen is left, passed to the tracks read as the `state` query parameter, so the read's own total is the filtered total and the header's count line follows it through a new `countTotal`; `keepPreviousData` keeps the previous state's rows while the new one loads, while the shuffled queue is the list the filter is not applied and its selection is kept for when the shuffle is turned off, and play and shuffle keep reading the whole playlist's queue so a filter changes what is seen and not what plays. A filter that matches nothing draws the named empty state ("No failed tracks") with a "Show all" action, the chips are drawn from the whole-playlist counts so they never follow the filter, and the copy adds `detail.filterBy`, `detail.filterAll`, `detail.filterShowAll`, the five `detail.filterEmpty.*` sentences and `trackState.stored` in both catalogs.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
