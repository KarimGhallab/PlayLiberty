# 02: Retry a failed download on the next sync

**What to build:** A download that fails does not cost the listener the song. The worker marks the track
`failed` with a short reason a person can read and leaves no stored file, and the next sync returns a failed
track the source still lists to `pending`, so the worker picks it up again. Nothing retries on a timer; a
failed track waits for a sync.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A failing download leaves the track `failed` with a short failure reason and no stored file.
- [ ] The next sync returns a failed track that is still in the source to `pending`.
- [ ] The retried track is then downloaded and stored.
- [ ] Nothing retries a failed track on a timer.
