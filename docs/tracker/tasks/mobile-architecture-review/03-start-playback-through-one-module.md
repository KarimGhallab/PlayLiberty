# 03: Start playback through one module

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

Three screens prepare playback. The playlist detail has three start paths: the link entry, a row press and the header play or shuffle. The gallery reads the queue and starts. The bare-track entry builds a one-track queue by hand.

`startPlaylistPlayback` accepts a read callback from its caller. The caller therefore owns the queue read, the playable filter, the track mapping and the refusal drawing. The detail also shadows the exported read helper with its own version.

## Expected

One mobile playback start module owns the queue read, the playable filter, the track mapping, the queue-reuse rule and the refusal. It exposes start at playlist, start at track and start bare track.

A screen calls the module once and draws the refusal. The module reads the queue route through the query client. The header play, the shuffle, a row press, the shared link, the gallery card and the bare route keep their current outcomes.

## Evidence

`apps/mobile/src/player/startPlaylistPlayback/startPlaylistPlayback.ts` exports `readPlayableQueue` and `startPlaylistPlayback`, whose `read` parameter moves the real dependency back to the caller, at lines 36 to 71.

`apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx` starts from the link effect at lines 349 to 399, from a row press at 460 to 499 and from the header at 958 to 999. It filters and maps at lines 384 and 322.

`apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx` reads and starts at lines 358 to 380.

`apps/mobile/src/views/track/BareTrackEntry/BareTrackEntry.tsx` builds a player track by hand at lines 107 to 120.

The report for this review is `/tmp/architecture-review-20261108-151358.html`, candidate 5.

## Acceptance criteria

- [ ] One mobile module owns the queue read, the `isPlayable` filter, the `playerTracks` mapping, the queue-reuse rule and the refusal vocabulary.
- [ ] The module exposes start at playlist with a play or shuffle intent, start at a track, and start a bare track.
- [ ] A shuffle start draws a leader from the whole playable queue.
- [ ] The link entry, the row press, the header play, the header shuffle, the gallery card and the bare route behave as today.
- [ ] The playlist detail cannot restart a queue it already owns when the link equals the current track.
- [ ] The screens no longer import `isPlayable`, `playerTracks` or the store's start action for these paths.
- [ ] `startPlaylistPlayback` and its exported read helper are deleted.

## Verification

`pnpm --filter @playliberty/mobile exec jest src/views/playlist/PlaylistDetail src/views/library/PlaylistGallery src/views/track/BareTrackEntry src/player/playerStore`, `pnpm run build`, `pnpm run lint:check`.
