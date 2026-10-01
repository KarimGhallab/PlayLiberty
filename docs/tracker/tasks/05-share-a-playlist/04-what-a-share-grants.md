# 04: What a share grants

**What to build:** The two levels, proved through the routes rather than asserted on the share row. A read
collaborator sees the playlist in the library and reads it and its tracks, and the stream and the thumbnail
answer with the track's state rather than a refusal; every mutating route refuses it. A write collaborator adds
a video, removes a track, retries a failed one and syncs, and rename, delete and all three share routes refuse
it, because managing shares is ownership. A non-collaborator is refused the share routes and answers `404` for
the playlist itself. Sharing copies nothing: it creates no second track, moves no count, stores no second file,
and a sync leaves a share alone.

**Blocked by:** [`02`](02-list-and-grant-shares-on-a-playlist.md), [`03`](03-revoke-a-share.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A read collaborator sees the playlist in the library, reads it and its tracks, and reaches the stream and the thumbnail rather than being refused.
- [ ] Every mutating route refuses a read collaborator.
- [ ] A write collaborator adds a video, removes a track, retries a failed track and syncs.
- [ ] Rename, delete and all three share routes refuse a write collaborator.
- [ ] A non-collaborator is refused the share routes and answers `404` for the playlist.
- [ ] Sharing creates no second track, changes no count and stores no second file.
- [ ] A sync of a shared playlist leaves the share in place.
