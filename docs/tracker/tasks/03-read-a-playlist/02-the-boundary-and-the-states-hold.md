# 02: The boundary and the states hold

**What to build:** The same route held against the cases a screen depends on. An owner, a read collaborator
and a write collaborator each receive the playlist's tracks; a playlist owned by another account with no share,
and a revoked share, each answer `404`, the same answer as never having had one. Every track is returned
faithfully whatever its state: each file status and source status comes back as stored, including
`unavailable` and a failed track with its reason, and a track with no thumbnail and no duration comes back with
both null rather than with the keys absent. The failure reason is returned as stored and not truncated, because
presenting it within the row is the design system's job and a truncated reason is one the user cannot act on.

**Blocked by:** [`01`](01-read-the-tracks-of-a-playlist.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An owner, a read collaborator and a write collaborator each receive the playlist's tracks.
- [ ] A playlist owned by another account with no share answers `404`.
- [ ] A revoked share answers `404` from that moment, the same answer as never having had one.
- [ ] Every file status and source status in the glossary's table is returned faithfully, including `unavailable` and a failed track with its reason.
- [ ] A track with a null thumbnail and a null duration is returned with both null rather than omitted.
- [ ] A failure reason is returned as stored rather than truncated.
