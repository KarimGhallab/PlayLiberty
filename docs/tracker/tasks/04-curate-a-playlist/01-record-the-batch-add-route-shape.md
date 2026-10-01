# 01: Record the batch-add route shape

**What to build:** A decision record for the one route shape this spec changes the contract for. Adding a
video is one top-level request that names the video by URL and the playlists by id, and answers one outcome per
chosen playlist, rather than a request nested under a single playlist. The record has to say why the nested
route is replaced rather than kept, why the request is a video URL and a non-empty list of ids, and why a
refused playlist carries no reason. It is the decision ticket 02 implements, and it exists because the shape
changes a contract more than one consumer reads.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] An architecture decision record under `docs/adr/` records the route shape: one top-level request carrying a video URL and a list of playlist ids, answering one outcome per playlist in the order the ids were sent.
- [x] It records why a refused playlist carries no reason, in the same terms the playlist and sync routes answer `404` rather than `403`.
- [x] It states the shape it replaces, one request per playlist, and why a path that names one playlist could not express the choice of several.
- [x] It notes that the request body is the same shape the create-a-playlist dialog uses for a different purpose, so the two are told apart by the field rather than the URL alone.

## Outcome

Written. `docs/adr/0012-add-a-video-in-one-batch-request.md` records the decision: one top-level `POST /tracks`
carrying a video URL and a non-empty list of at most a hundred playlist ids, answering one outcome per chosen
playlist in the order the ids were sent, with `already_present` a success and `refused` carrying no reason.

The record gives the reason the nested route is replaced rather than kept: a path that already names a playlist
cannot express a choice of several, and a path under the video cannot be built because the client does not have
the video id until the server resolves the URL. It states the refusal rule as the same decision the playlist
and sync routes already make when they answer `404` rather than `403`, so the batch is not a way to learn which
playlist ids exist. It notes the shared `url` field with the create-a-playlist route, the `playlistIds` field
that tells the two apart, and the video-only rule, and it records the alternatives it rejects.

Verification: `pnpm run format`, `pnpm run lint`, `pnpm run build` and `pnpm run design:check` pass. No code
changed, so no test run; no em dashes. Not committed.
