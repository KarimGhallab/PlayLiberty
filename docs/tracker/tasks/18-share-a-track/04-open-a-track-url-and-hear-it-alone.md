# 04: Open a track's own URL and hear it alone

**Status:** resolved

## Outcome

`/tracks/T` now renders the gallery and plays `T` alone. The route resolves the track through the new authenticated read, starts a one-track queue with no playlist context, and tries to autoplay; a refused play leaves it paused. A reload keeps the queue paused at its position and the address on the track. Starting another queue from the gallery replaces the address with `/`, while a failed entry keeps `/tracks/T`.

The server read is instance-wide: the track metadata, the stream and the thumbnail answer for any authenticated account, because the id is the capability. Retry and fetch-whole stay write-gated behind an associating playlist share, and a track with no stored media still answers 409. The read sends the Track fields only, never the media path.

A track that cannot play starts no queue and leaves the gallery drawn. The notice names the track and its reason: not stored, failed download, or a video gone with no file; an unknown id gets its own sentence. The notice withdraws on the same window as the other refusals.

Verification: `pnpm run build`, `pnpm run lint:check`, the unit suites (web 639, server 438, egress agent 54, UI foundation 5) and the e2e typecheck pass. The new bare-route e2e journey passes in Chromium: the track URL plays over the gallery, a reload holds it paused, and the gallery's playlist takes the address back. The server route tests cover the no-association read, stream and thumbnail, the write refusals, the 409 and the 404; the track page tests cover the start, the idempotence, the three unplayable notices, the unknown id, the exit and the failed-entry baseline.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
