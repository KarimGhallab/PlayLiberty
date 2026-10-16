# 02: Store a track with non-music parts skipped

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).
**Status:** resolved

## Outcome

Implemented and verified. `track.skip_non_music` is a boolean column, not null, defaulting to true (migration
`0006_shallow_omega_red`), and `TrackSchema` gains a required `skipNonMusic`. `TrackSeed` gains the field,
`createPendingTrack` writes it, and `toTrackView` returns it, so it crosses the wire on both the playlist tracks
read and the retry reply.

- **The sync.** `reconcile` passes `playlist.skipNonMusic` into `ensureTrack`, which passes it to
  `createPendingTrack` only when it creates a row. A track that already exists is left as it is, so a failed one
  is re-queued without its policy moving.
- **The manual add.** `addTrackToPlaylists` reads the first writable playlist's value with
  `firstWritableSkipNonMusic`, which is the first id whose `canWritePlaylist` is true, not the first id. A
  refused playlist before a writable one therefore does not set the policy.
- **The adapter.** `DownloadTrackRequest` gains `skipNonMusic`; `buildDownloadArgs` gains the parameter and adds
  `--sponsorblock-remove music_offtopic,sponsor,selfpromo` when it is true. `--force-keyframes-at-cuts` is never
  emitted, which is what keeps the cut a stream copy, so [`Audio is stored as-is, never transcoded`](../../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded) stays true. The three categories are fixed in code.
- **The worker.** `storeTrack` passes `track.skipNonMusic` to the adapter, so the decision is read from the row
  and the worker still needs no playlist.
- **Whole and dedup.** A true download with no matching segments writes the file whole and exits zero, so the
  worker stores it; the fake's successful download is what exercises that path, not a real yt-dlp run. The
  existing reuse path already means a second playlist never re-fetches a stored track, and the test now also
  asserts the value does not move.

The tests: three adapter argument tests (the three categories present when true, absent when false, and
`--force-keyframes-at-cuts` absent in both), a sync that carries the playlist value onto both tracks, a manual
add whose first writable playlist is second and refused-first, a worker pass that hands the row's value to the
adapter, the tracks read carrying the value, and the second-association case asserting the value is unchanged.
Web `Track` fixtures and mock JSON gained `skipNonMusic`, because the contract field is required.

Verification: `pnpm run test` (server 229, web 262, youtube 17, e2e 21), `pnpm run build`, `pnpm run lint` pass. No em dashes. Not committed.
