# 06: Share the write permission and the action lists

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-scaffold-the-shared-client-packages.md).

## Observed

The owner-or-write rule exists three times: in the web actions module, in the mobile access module and again in the mobile bulk sync. Each client gates the same actions separately. Web builds the playlist menu and the track lane inline. Mobile has a playlist action module and a track action module. The bulk-sync set is five pure helpers on mobile and inline in the web library page.

The two clients also disagree on what a refusal is. The web Sync all carries the thrown error. The mobile one carries the same error and unwraps it at the notice.

## Expected

`@playliberty/ui-foundation` owns the permission and the four lists: the playlist actions, the track actions, the syncable set and the batch busy rule. The lists carry action keys and label keys. Each app maps a key to a glyph and a control, so no icon and no rendered component enters the package.

Sync all reports a refused press as a problem, not as an error object, so the notice builder needs no API type.

## Evidence

- `canWritePlaylist` in the web actions module, the mobile access module and the mobile bulk sync.
- Web playlist menu and track lane: inline in `playlistActions.tsx` and `TrackRow.tsx`.
- Mobile copies: `playlistActions.ts` (68 lines) and `trackActions.ts` (40 lines).
- Bulk sync: `bulkSync.ts` (180 lines) on mobile, inline in `LibraryPage.tsx` on web, with the same strings and branches.
- The owner keeps delete, rename and the shares. A write collaborator adds, removes and syncs.

## Acceptance criteria

- [ ] `ui-foundation` owns the permission and the playlist action list, the track action list, the syncable set and the batch busy rule.
- [ ] The package imports no icon set and no rendered component.
- [ ] Both apps map action keys to their own glyphs and controls.
- [ ] Sync all carries a problem, and the notice builder uses the problem, not an error object.
- [ ] The owner-only actions stay owner-only, and a read share holds none of the writes.
- [ ] The web inline gating and the mobile copies are deleted.

## Verification

The package suite covers the access matrix (owner, write, read, unloaded), the busy row, the failed row with and without the skip setting, and a refused Sync all. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
