# 19: One cache-effect map

**State:** `resolved`
**Category:** `enhancement`

## Outcome

One module owns the invalidation keys and the primitive per domain fact, and both paths consult it. A new `cacheEffects` module exposes the facts as `libraryChanged`, `playlistChanged`, `trackChanged`, `everyPlaylistChanged`, `playlistRemoved` and `everythingChanged`, each writing the keys it invalidates and the primitive it uses, and a key is written nowhere else in the invalidation path; the eleven mutations and the `liveEvents` mapping name a fact rather than restating keys. A playlist removal takes one primitive on both paths, `playlistRemoved` resetting the playlist's reads and invalidating the library, so the deleting client and the live-event path agree. What stays: the read hooks keep their own keys, and the optimistic setting write in `useUpdateSkipNonMusic` keeps its own read key in `onMutate`, because that is a cache write and not an invalidation.
