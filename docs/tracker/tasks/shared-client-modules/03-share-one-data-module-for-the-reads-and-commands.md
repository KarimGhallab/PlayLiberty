# 03: Share one data module for the reads and the commands

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/api-client` exports one hook per data endpoint: account, account page, egress and its two actions, library, create, sync all, pin, playlist, latest run, tracks, queue, cover, shares, and every playlist and track command. Each app calls `configureApiClient` once with its transport and adapter; the web root does it at startup and its test setup does it before a screen mounts.

The library read is one shape on both clients: `libraryKey` holds `InfiniteData<PlaylistPage>`, the hook flattens the pages for its callers, and the page bound is `LIBRARY_PAGE_SIZE`. Web observes the grid's end and calls `fetchNextPage`, and the filter bar reads the server's `total` instead of the loaded count. The track hook carries both `tracks` and `items` while the two screens settle on one name, and the queue cache keeps the route's `{ items }` shape so the hook and the player read the same value.

The five web client files, their obsolete tests, the 28 mobile hook files, the mobile page cache and the web optimistic patch are gone. The keys and the invalidation remain in `@playliberty/query`; the package tests cover each hook's key and each mutation's cache fact, plus the paging bounds, the directory name, the cover query, the batch sync and the created row.
