# 01: Build the queue and play it

**What to build:** A listener presses play on a track and the whole playlist becomes the queue, starting at the
track pressed rather than from the top. Playing a track in another playlist replaces the queue rather than
extending it. Each queue entry records the playlist the queue was built from, so the player can name where the
music comes from. The queue holds track ids and the playlist it belongs to, never a stream address, which is
derived when a track is reached. A refetch of the playlist re-applies the order the queue was built with: a
known track keeps its place, a track new to the queue is appended, and a track the refetch no longer returns is
dropped, and none of that moves the current index or the offset. The persisted state is the queue, its order,
the index of the current track and the offset within it, and a relaunch resumes at that offset rather than at
the start of the track.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] Pressing play on a track builds the queue from that track's playlist, in the playlist's order, starting at that track.
- [x] Playing a track in another playlist replaces the queue rather than extending it, and records the new playlist.
- [x] A refetch arriving mid-playback leaves the order, the index and the offset unchanged, merging by track id as known, new and dropped.
- [x] The persisted state carries the order, the index and the offset, and a relaunch resumes at the offset.
- [x] The queue survives closing and reopening the tab, and playing writes nothing to the server.

## Outcome

Implemented and verified in a real browser.

The store's model is replaced rather than extended. `PlayerTrack` gained `playlistId`, `durationSeconds` and `thumbnailPath`, so an entry carries what the bar needs to name and draw the current track without a second read. `startQueue`, `applyRefetch` and `play` replace the scaffold's `enqueue` and `replaceQueue`, which had no notion of a playlist or of a start track.

**The cursor is an id, and the index is derived.** The ticket says "the index of the current track", and the persisted state holds an id with `currentIndex(state)` deriving the position. The reason is the ticket's own third criterion: a refetch drops tracks, and a drop shifts every index after it, so a persisted index would point at the wrong track the moment the queue changed. An id points at the same track or at nothing, and the index a caller wants is computed against the queue it is current for. This is the one place the implementation reads the ticket's word "index" as the cursor rather than a stored array offset, and it is recorded here because it is a decision and not a literal.

**A refetch of another playlist changes nothing.** `applyRefetch` merges only when the queue already holds entries from that playlist, so a background read of some other playlist cannot extend the queue across playlists, which is the thing the queue exists to avoid. The merge itself is the scaffold's, kept as a pure `mergeQueue`: known ids keep their place, new ids append in the server's order, dropped ids are gone, and the current track and offset are untouched.

**The current track leaving the source clears the cursor rather than moving it.** When a refetch no longer returns the current track there is no track to be on, so the offset resets and playback stops. Whether the queue then advances to the next track is ticket 03's, and the store deliberately refuses to keep a cursor pointing at nothing rather than guessing at the skip policy here.

**The demoable surface is minimal and is ticket 04's to replace.** The ticket could not be demonstrated without a way to press play, so the playlist detail now reads its tracks through `usePlaylistTracks` (`['playlist', id, 'tracks']`, the key spec 09 names) and renders one unstyled play button per track that calls `startQueue`. `toPlayerTracks` stamps the playlist id on every entry once, so the store and the bar never ask which playlist a bare `Track` came from. The real track list, the playable/not-playable distinction and the player bar are ticket 04; the audio element and the resume-at-offset seek are ticket 02.

Tests: twelve in `playerStore.test.ts` covering the five criteria (build from the pressed track in playlist order; a press in another playlist replaces and records it; a track outside the playlist is ignored; a start track not in the list starts nothing; merge keeps order, drops and appends; the current track and offset survive a reorder and a drop before it; the current track's own removal clears the cursor; another playlist's refetch is inert; play does not reset an offset it is already on; `currentIndex`), plus a relaunch case added to `playerPersistence.test.ts` and three in the new `PlaylistDetailPage.test.tsx` (the list renders, a press builds the queue from the playlist in order and starts at the pressed track, a failed read says so rather than looking empty).

Verified in Chrome against the real instance: pressing the third of four tracks built a four-entry queue in playlist order, every entry carrying `playlistId`, with `currentId` on the third track and `positionSeconds` advancing; a full reload restored the queue, the same current track and a 6.79s offset, with `isPlaying` false so nothing autoplayed, and the audio element's `src` was derived from the track id (`/api/v1/tracks/<id>/stream`) rather than stored in the queue. No request other than the tracks read and the stream was made.

Verification: `pnpm run test:unit` (224 server, 68 web, 14 ui-foundation, 14 youtube, 3 tokens), `pnpm run build`, `pnpm run lint`, `npx depcruise .` (138 modules, 0 violations) and `pnpm run design:check` all pass. No em dashes. Not committed.
