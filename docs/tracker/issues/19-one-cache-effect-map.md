# 19: One cache-effect map

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** None. Can start immediately.

## Outcome

Done. One module owns the invalidation keys and the primitive per domain fact, and both paths consult it.

- A new `cacheEffects` module exposes the facts as an object: `libraryChanged`, `playlistChanged`, `trackChanged`, `everyPlaylistChanged`, `playlistRemoved` and `everythingChanged`. Each writes the keys it invalidates and the primitive it uses, and a key is written nowhere else in the invalidation path.
- The eleven mutations name the fact rather than restating keys: create and the setting change name `libraryChanged`; sync, rename, grant and revoke name `playlistChanged`; retry, fetch-whole and remove-track name `trackChanged`; the batch add names `everyPlaylistChanged`; delete names `playlistRemoved`.
- `liveEvents` names a fact per event type: `Ready` to `everythingChanged`, `PlaylistChanged` to `playlistChanged`, `PlaylistRemoved` to `playlistRemoved`, `TrackChanged` to `trackChanged`. `useEventStream`'s refused-session path takes `everythingChanged` too, so the whole-read refetch has one owner.
- A playlist removal takes one primitive on both paths. `playlistRemoved` resets the playlist's reads and invalidates the library, so the deleting client and the live-event path agree; the delete no longer removes the query while the event resets it.
- The shares read is `['playlist', id, 'shares']`, which the `['playlist', id]` prefix already carries, so grant and revoke name `playlistChanged` rather than restating the shares key. The queries refetched are unchanged.
- What stays: the optimistic setting write in `useUpdateSkipNonMusic` keeps its own read key in `onMutate`, because that is a cache write and not an invalidation, and the read hooks keep their own keys.

Tests: `cacheEffects.test.ts` pins the keys and the primitive at the map's interface. `mutationInvalidation.test.tsx` and `liveEvents.test.ts` now assert the fact each caller names, not the keys, and `useEventStream.test.tsx` hands a frame to the mapping. A `fetch-whole` handler was added to the mocks so that mutation's fact is covered.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 383, server 316, i18n 39, ui-foundation 6, youtube 31, tokens 3) pass. Not committed.
