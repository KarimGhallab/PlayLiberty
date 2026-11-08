# 04: Open a track's own URL and hear it alone

**Status:** resolved

## Outcome

`/tracks/T` now renders the gallery and plays `T` alone. The route resolves the track through the new authenticated read, starts a one-track queue with no playlist context, and tries to autoplay; a refused play leaves it paused. A reload keeps the queue paused at its position and the address on the track. Starting another queue from the gallery replaces the address with `/`, while a failed entry keeps `/tracks/T`.

The server read is instance-wide: the track metadata, the stream and the thumbnail answer for any authenticated account, because the id is the capability. Retry and fetch-whole stay write-gated behind an associating playlist share, and a track with no stored media still answers 409. The read sends the Track fields only, never the media path.

A track that cannot play starts no queue and leaves the gallery drawn. The notice names the track and its reason: not stored, failed download, or a video gone with no file; an unknown id gets its own sentence. The notice withdraws on the same window as the other refusals.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
