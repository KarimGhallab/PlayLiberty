# 02: Store a track with non-music parts skipped

**What to build:** A track records the policy when it is created, so the download worker can read it without a
playlist in scope. A sync writes the syncing playlist's value; the manual add, which creates one track for a
list of playlists, writes the first writable playlist's value in request order. The download worker passes the
flag to the adapter, which cuts the three fixed categories (`music_offtopic`, `sponsor`, `selfpromo`) out of the
stored audio with a lossless stream copy and never re-encodes. A video with no segments in those categories is
stored whole and is not a failure. A second playlist that references a stored track neither re-fetches it nor
changes its value. The track's recorded value is returned on the track read, so a client can show why a track is
full length.

**Blocked by:** [`01`](01-freeze-the-skip-setting-on-a-playlist.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A sync creates a track carrying the syncing playlist's value.
- [x] A manual add to several playlists with mixed values records the first writable playlist's value.
- [x] The worker passes the value to the adapter; with it true the download arguments carry the three categories, and `--force-keyframes-at-cuts` never appears on the path.
- [x] A video with no segments is stored whole and `stored`.
- [x] A second playlist referencing a stored track does not re-fetch it and does not change its value.
- [x] The track read returns the recorded value.
- [x] One video id still maps to one track row and one stored file.

**Verification:** the server route tests over a temporary database, the adapter's argument tests, `pnpm run build`
and `pnpm run lint`.

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
  emitted, which is what keeps the cut a stream copy and ADR 0002 true. The three categories are fixed in code.
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

Verification: `pnpm run test` (server 229, web 262, youtube 17, e2e 21), `pnpm run build`, `pnpm run lint` and
`pnpm run design:check` pass. No em dashes. Not committed.
