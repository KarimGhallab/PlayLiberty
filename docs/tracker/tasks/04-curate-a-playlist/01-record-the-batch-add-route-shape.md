# 01: Record the batch-add route shape

**What to build:** A decision record for the one route shape this spec changes the contract for. Adding a
video is one top-level request that names the video by URL and the playlists by id, and answers one outcome per
chosen playlist, rather than a request nested under a single playlist. The record has to say why the nested
route is replaced rather than kept, why the request is a video URL and a non-empty list of ids, and why a
refused playlist carries no reason. It is the decision ticket 02 implements, and it exists because the shape
changes a contract more than one consumer reads.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An architecture decision record under `docs/adr/` records the route shape: one top-level request carrying a video URL and a list of playlist ids, answering one outcome per playlist in the order the ids were sent.
- [ ] It records why a refused playlist carries no reason, in the same terms the playlist and sync routes answer `404` rather than `403`.
- [ ] It states the shape it replaces, one request per playlist, and why a path that names one playlist could not express the choice of several.
- [ ] It notes that the request body is the same shape the create-a-playlist dialog uses for a different purpose, so the two are told apart by the field rather than the URL alone.
