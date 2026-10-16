# 01: Build the queue and play it

**Status:** resolved

## Outcome

The store's model is replaced rather than extended: `PlayerTrack` gained `playlistId`, `durationSeconds` and `thumbnailPath`, and `startQueue`, `applyRefetch` and `play` replace the scaffold's `enqueue` and `replaceQueue`. The cursor is an id with `currentIndex(state)` deriving the index, because a refetch that drops a track would shift a persisted index onto the wrong track. `applyRefetch` merges only when the queue already holds entries from that playlist, through a pure `mergeQueue` where known ids keep their place, new ids append in the server's order and dropped ids are gone; when the current track leaves the source the cursor clears and playback stops. The playlist detail reads its tracks through `usePlaylistTracks` (`['playlist', id, 'tracks']`) and renders one unstyled play button per track that calls `startQueue`, with `toPlayerTracks` stamping the playlist id on every entry.

See [`07-play-stored-audio`](../../specs/07-play-stored-audio.md).
