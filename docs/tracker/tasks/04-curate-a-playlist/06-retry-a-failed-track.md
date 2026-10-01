# 06: Retry a failed track

**What to build:** An account that can write any playlist holding a failed track puts that track back in the
queue, without running a whole sync. The track returns to `pending` with its failure reason cleared, which is
the state the download worker claims on its next pass. The right follows the track rather than the playlist,
because the track is instance-wide and a household shares one copy, so anyone who can write a playlist that
holds it may retry it; nobody else can, and a track no writable playlist holds answers `404` the same as one
that does not exist. Retrying is refused for a track that is `unavailable`, which is terminal and would be a
way to keep asking for a video that cannot come back, and for any state that is not `failed`. Retry starts no
sync and creates no run.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner or a write collaborator of a playlist holding a failed track retries it; it becomes `pending` with its failure reason cleared.
- [ ] Retry creates no sync run and starts no sync.
- [ ] Retry is refused for an `unavailable` track, and for a `stored`, `pending` or `downloading` one.
- [ ] A read collaborator, a stranger, and a track no writable playlist holds each answer `404`, and a missing track answers the same.
- [ ] The request is refused without the client header.
