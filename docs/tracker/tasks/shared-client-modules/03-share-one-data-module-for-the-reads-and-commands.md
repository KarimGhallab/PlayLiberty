# 03: Share one data module for the reads and the commands

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-move-the-api-protocol-into-one-transport.md).

## Observed

The web client owns five files that read and command the API, 825 lines in total. The mobile client owns 28 hook files, 1,104 lines in total. Eighteen of those hooks differ from a web op only by which fetch helper they call.

The library read already has two shapes under one key. Web holds one `PlaylistPage` and never sends a limit, so the server's default of 50 is the ceiling. Mobile holds `InfiniteData<PlaylistPage>` and pages to 200. Web reports the loaded count as the total, so a gallery past 50 under-reports.

## Expected

`@playliberty/api-client` owns one hook per endpoint, used by both apps. The app injects its transport once. The keys and the invalidation stay in `@playliberty/query`.

The library read has one shape: `InfiniteData<PlaylistPage>` on both clients. Web gains paging and reads its total from the server's response.

Move the domains in batches: account, egress and track first, then library, then the playlist reads and commands. Delete the old files after the last batch.

## Evidence

- Web clients: account 48, egress 50, library 136, playlist 575, track 16.
- Mobile hooks: 28 files, 1,104 production lines.
- The mobile `usePlaylist`, `useLatestSyncRun`, `useRenamePlaylist`, `useRetryTrack`, `useFetchTrackWhole`, `useRemoveTrack`, `useGrantShare` and `useRevokeShare` carry the same body as their web twin.
- The page bound is written four times: web tracks, mobile tracks, mobile accounts, mobile gallery.
- The server default page limit is 50. Web never sets a limit and has no next-page call for the gallery.

## Acceptance criteria

- [x] One hook per endpoint lives in `api-client`. Every page and screen in both apps imports it.
- [x] The app builds the transport once, with its own auth adapter, and the hooks use it.
- [x] `libraryKey` holds `InfiniteData<PlaylistPage>` on both clients.
- [x] Web pages the gallery past the first page and shows the server's total.
- [x] The five web client files and the 28 mobile hook files are gone.
- [x] Every read still uses the key and the invalidation from `@playliberty/query`.
- [x] The web and mobile suites pass, apart from assertions that named a deleted file.

## Outcome

`@playliberty/api-client` exports one hook per data endpoint: account, account page, egress and its two actions, library, create, sync all, pin, playlist, latest run, tracks, queue, cover, shares, and every playlist and track command. Each app calls `configureApiClient` once with its transport and adapter; the web root does it at startup and its test setup does it before a screen mounts.

The library read is one shape on both clients: `libraryKey` holds `InfiniteData<PlaylistPage>`, the hook flattens the pages for its callers, and the page bound is `LIBRARY_PAGE_SIZE`. Web observes the grid's end and calls `fetchNextPage`, and the filter bar reads the server's `total` instead of the loaded count. The track hook carries both `tracks` and `items` while the two screens settle on one name, and the queue cache keeps the route's `{ items }` shape so the hook and the player read the same value.

The five web client files, their obsolete tests, the 28 mobile hook files, the mobile page cache and the web optimistic patch are gone. The keys and the invalidation remain in `@playliberty/query`; the package tests cover each hook's key and each mutation's cache fact, plus the paging bounds, the directory name, the cover query, the batch sync and the created row.

Verification: `pnpm run build` and `pnpm run lint:check` pass; `pnpm run test:unit` passes with 55 web files and 69 mobile suites; the `api-client` package runs 42 tests.

## Verification

The package suite covers each hook's key and its invalidation. A web test holds 51 playlists and proves the second page loads and the total reads 51. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
