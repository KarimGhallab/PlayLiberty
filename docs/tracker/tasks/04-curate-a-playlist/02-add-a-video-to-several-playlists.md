# 02: Add a video to several playlists

**What to build:** A listener pastes a single video URL, chooses the playlists it belongs in, and one request
adds it to all of them. The request carries the video URL and a non-empty list of at most a hundred playlist
ids, and answers one outcome per id, in the order the ids were sent, so a client can report against the list
the user chose from. For each playlist the account can write, the video becomes a manual association appended
at the end, and the playlist's track count moves with it; a playlist that already holds the video reports
`already_present`, which is a success because the end state is the one the user asked for. A playlist the
account cannot write, one that does not exist, one that was deleted, or one whose share was revoked reports
`refused`, and the four are indistinguishable, because the batch must not become a way to learn which playlist
ids exist. The video is resolved once through the adapter and one track results: a video the instance has never
seen becomes one track in `pending`, and one it already holds is reused untouched, whatever state it is in. A
playlist URL, an empty list, a malformed URL or more than a hundred ids refuses the whole request with `422`
and creates no association and no track. The stubbed nested add route goes away.

**Blocked by:** [`01`](01-record-the-batch-add-route-shape.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] One request naming three writable playlists adds one track and three manual associations, each appended at the end, and each playlist's track count moves by one.
- [ ] The result carries one outcome per chosen playlist, in the order the ids were sent.
- [ ] A playlist that already holds the video reports `already_present`, and the rest of the batch still succeeds.
- [ ] A read collaborator's playlist is `refused` while a writable one in the same request is `added`.
- [ ] A playlist that does not exist is `refused` with the same shape as a refused writable one, so the two cannot be told apart.
- [ ] A playlist URL refuses the whole request with `422`, and no association and no track is created anywhere.
- [ ] An empty list, a malformed URL, and more than a hundred ids are each refused with `422`.
- [ ] A video the instance already holds produces one track and no second fetch, and an existing `stored` or `failed` track is left untouched rather than re-queued.
- [ ] An existing association's position is unchanged and a new one is appended.
- [ ] The nested per-playlist add route and its input schema are removed.
- [ ] The request is refused without the client header.
