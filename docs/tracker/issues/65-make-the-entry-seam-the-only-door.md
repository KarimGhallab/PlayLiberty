# 65: Make the entry seam the only door

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`isPlaylistOwner` and `canWritePlaylist` are gone, and `satisfies` in `entry.ts` is the only place the ownership and writability conjunctions are written. `playlistEntry` is the only reader of the resolved level; `resolvePlaylistAccess` is called by the seam alone, and no feature imports it.

The four bypassing modules now cross the seam. `shareService.listSharesForAccount`, `grantShareForAccount` and `revokeShareForAccount` take an `AccessNeed.Owner` entry, `syncService.startSyncForPlaylist` takes `AccessNeed.Write`, `syncRunService.resolveLatestSyncRun` takes `AccessNeed.Read`, and `addTrackToPlaylists` asks the seam for each batch id. Their handlers run only when granted, so a denied account reaches neither the query nor the write, and every route answers the same refusal as before.

`entry.test.ts` already covers the seam's granted and denied outcomes for read, write and owner. The four entry points keep their existing grant and refusal coverage in `shareAccess.test.ts`, `syncService.test.ts` (`authorizing a sync`), `syncRunRoutes.test.ts` and `trackRoutes.test.ts`, all passing unchanged.
