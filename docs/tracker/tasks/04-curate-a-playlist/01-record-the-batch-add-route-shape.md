# 01: Record the batch-add route shape

**Status:** resolved

## Outcome

Written. [`Adding a video is one batch request`](../../../ARCHITECTURE.md#adding-a-video-is-one-batch-request) records the decision: one top-level `POST /tracks` carrying a video URL and a non-empty list of at most a hundred playlist ids, answering one outcome per chosen playlist in the order the ids were sent, with `already_present` a success and `refused` carrying no reason. A path that already names a playlist cannot express a choice of several, and a path under the video cannot be built because the client does not have the video id until the server resolves the URL, so the nested route is replaced rather than kept. The refusal rule is the same decision the playlist and sync routes already make when they answer `404` rather than `403`, so the batch is not a way to learn which playlist ids exist. The route shares the `url` field with create-a-playlist, is told apart by `playlistIds`, and takes video URLs only.

See [`04-curate-a-playlist`](../../specs/04-curate-a-playlist.md).
