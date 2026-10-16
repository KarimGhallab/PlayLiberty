# 01: Record the batch-add route shape

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Written. [`Adding a video is one batch request`](../../../ARCHITECTURE.md#adding-a-video-is-one-batch-request) records the decision: one top-level `POST /tracks`
carrying a video URL and a non-empty list of at most a hundred playlist ids, answering one outcome per chosen
playlist in the order the ids were sent, with `already_present` a success and `refused` carrying no reason.

The record gives the reason the nested route is replaced rather than kept: a path that already names a playlist
cannot express a choice of several, and a path under the video cannot be built because the client does not have
the video id until the server resolves the URL. It states the refusal rule as the same decision the playlist
and sync routes already make when they answer `404` rather than `403`, so the batch is not a way to learn which
playlist ids exist. It notes the shared `url` field with the create-a-playlist route, the `playlistIds` field
that tells the two apart, and the video-only rule, and it records the alternatives it rejects.

Verification: `pnpm run format`, `pnpm run lint`, `pnpm run build` pass. No code
changed, so no test run; no em dashes. Not committed.
