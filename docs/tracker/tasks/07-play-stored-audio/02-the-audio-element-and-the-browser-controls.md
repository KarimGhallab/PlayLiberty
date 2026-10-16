# 02: The audio element and the browser controls

**Status:** resolved

## Outcome

Seeking needs a signal separate from reporting: the store gained a transient `seekTo` written by `seek(seconds)` and cleared by the element after it applies it, and the element applies the persisted `positionSeconds` on `loadedmetadata` because `currentTime` is silently dropped before the duration is known. `skipNext` at the last track does nothing while `advance` stops playback and resets the playhead, and `PersistedPlayerState` gained `volume`, normalized to the default when absent rather than failing the read. `mediaSession.ts` feature-detects a usable `setActionHandler` rather than the key, registers each action in its own `try`, and re-publishes metadata on every track change; the artwork is `new URL('/api/v1/tracks/<id>/thumbnail', window.location.origin).href`. `PlayerTrack` gained `playlistName`, persisted alongside the id and stamped by `toPlayerTracks`, and the name comes from a new `GET /playlists/:id` consumed by `usePlaylist`.

See [`07-play-stored-audio`](../../specs/07-play-stored-audio.md).
