# 03: Skip what cannot be played

**Status:** resolved

## Outcome

Playability is decided in one place and enforced in three: `toPlayerTracks` keeps only associations whose `fileStatus` is `stored`, `PlaylistDetailPage` renders the play button only for a stored track and none otherwise, and the store's `dropAndAdvance(id)` removes an entry and, when it was current, moves to the entry now at that index and keeps playing, or stops and resets at the end. An `<audio>` element reports a failure as a `MediaError` and never the HTTP status, so `PlayerAudio` handles `error` by classifying it and `classifyStreamFailure` re-asks the stream route with a `HEAD` probe. `403`, `404` and `409` classify as `Gone` and drop the track; a `5xx` or a network rejection classifies as `Unknown` and stops without dropping, while a `401` is a `Session` that does nothing to the queue. The `failedId` is captured before the probe and compared against the store's current id when it resolves, so a late probe does not touch the track now playing.

See [`07-play-stored-audio`](../../specs/07-play-stored-audio.md).
