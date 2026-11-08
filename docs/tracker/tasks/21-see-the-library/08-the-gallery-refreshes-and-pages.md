# 08: The gallery refreshes and pages

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The gallery's read is now an infinite query. The first page asks the route's maximum, 200, so the scope and chip counts are whole up to that size; the next offset is the loaded count, and the loaded pages flatten into the one list the gallery already read, so the counts follow the pages that arrived.

The grid pulls to refresh through a `RefreshControl`, which refetches every loaded page. Scrolling within 384 points of the bottom asks for the next page, guarded by `hasNextPage` and `isFetchingNextPage`; there is no Load more control.

The optimistic pin patches every loaded page, not the first alone, so a pinned playlist on page two regroups with the rest. The deferred delete hides by playlist id over the flattened list, so it works across pages too.

The paging tests cover the next offset after a full page, the stop at the total and on an empty page, and the page flattening with the first total. The gallery tests cover the pull-to-refresh refetch, appending near the last row, and waiting while the last row is far.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
