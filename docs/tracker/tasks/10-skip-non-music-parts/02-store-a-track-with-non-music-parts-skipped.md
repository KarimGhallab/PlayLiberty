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

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A sync creates a track carrying the syncing playlist's value.
- [ ] A manual add to several playlists with mixed values records the first writable playlist's value.
- [ ] The worker passes the value to the adapter; with it true the download arguments carry the three categories, and `--force-keyframes-at-cuts` never appears on the path.
- [ ] A video with no segments is stored whole and `stored`.
- [ ] A second playlist referencing a stored track does not re-fetch it and does not change its value.
- [ ] The track read returns the recorded value.
- [ ] One video id still maps to one track row and one stored file.

**Verification:** the server route tests over a temporary database, the adapter's argument tests, `pnpm run build`
and `pnpm run lint`.
