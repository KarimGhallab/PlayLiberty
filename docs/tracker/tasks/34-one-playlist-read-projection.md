# 34: One playlist read projection

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`playlistProjection.ts` is the one read projection. `toPlaylistView` (moved unchanged from `playlistService.ts`) assembles a `Playlist` from a row and its resolved access, shares, pin and cover facts; the detail read, the page read and all four mutation answers (rename, skip-non-music, sort, pin) build through it. Counts stay the page's own, added by its caller.

The cover gained one owner: `coverTrackIds` (batch) and `coverTrackId` (its single-playlist projection) resolve the first association by `position`, then `rowid`, so a position tie has one answer whichever read asks. The detail path now calls the single projection of the same resolver instead of its own position-only query, which is what made the tie disagree.

`listPlaylistsForAccount` fails closed: a visible row the batch access resolver did not answer is dropped from `items` rather than reported as `owner`. `total`, pagination, response shapes and status codes are unchanged, and the pin and shares lookups stay batched on the page path and single on the detail path.

Two tests hold it in `playlistRoutes.test.ts`: a position tie answers the same cover from `/playlists/:id` and `/playlists`, and a forced access-resolver miss leaves the row out of the page. The first failed before the change (detail `first`, page `second`); the second failed on the old `?? 'owner'`.

Verification: `pnpm --filter @playliberty/server run test` is 386 passed (28 files); `pnpm run build` and `pnpm run lint` pass. The playlist route, share access and sync suites pass unchanged.

See [ARCHITECTURE.md](../../ARCHITECTURE.md).
