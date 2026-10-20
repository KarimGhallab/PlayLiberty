# 03: A mutation reaches the other screen and the other account

**Status:** resolved

## Outcome

The playlist and track features are now publishers, and the invalidation map is pinned mutation by mutation. The publishers live in `shared/events/liveEvents.ts` (`publishPlaylistChanged`, `publishPlaylistRemoved`, `publishTrackChanged`, `publishTracksChangedForPlaylists`), so a feature says what changed and the module applies the audience rule. A removal is its own shape: the track outlives the association, so the removed playlist is named directly rather than resolved from the track, and the deletion's audience is captured before the row is gone. The bus is carried on the context with `AppOptions.events` as the seam, so a route test subscribes and observes what a handler published while a real process still gets one built in `buildApp`.

See [`09-keep-the-screens-current`](../../specs/09-keep-the-screens-current.md).
