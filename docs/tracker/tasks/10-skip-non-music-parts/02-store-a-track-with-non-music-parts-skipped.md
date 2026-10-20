# 02: Store a track with non-music parts skipped

**Status:** resolved

## Outcome

`track.skip_non_music` is a boolean column, not null, defaulting to true (migration `0006_shallow_omega_red`), and `TrackSchema` gains a required `skipNonMusic`, written by `createPendingTrack` and returned by `toTrackView` on both the tracks read and the retry reply. `reconcile` passes `playlist.skipNonMusic` into `ensureTrack`, which passes it to `createPendingTrack` only when it creates a row, so an existing track keeps its policy, and `addTrackToPlaylists` reads it from `firstWritableSkipNonMusic`, the first id whose `canWritePlaylist` is true rather than the first id. `DownloadTrackRequest` gains `skipNonMusic`, and `buildDownloadArgs` adds `--sponsorblock-remove music_offtopic,sponsor,selfpromo` when it is true; the three categories are fixed in code. `--force-keyframes-at-cuts` is never emitted, which keeps the cut a stream copy, so [Audio is stored as-is, never transcoded](../../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded) stays true.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
