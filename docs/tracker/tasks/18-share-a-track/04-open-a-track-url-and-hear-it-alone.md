# 04: Open a track's own URL and hear it alone

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## What to build

`/tracks/T` renders the gallery with `T` playing alone, with no playlist context. Any authenticated account may read a track by id, stream it and read its thumbnail, because the track id is the capability; retry and fetch-whole stay gated behind write access to an associating playlist. The route attempts autoplay, restores paused on reload, replaces the address to `/` when another queue starts, and explains a track that cannot play.

## Acceptance criteria

- [ ] The contracts declare and the server serves an authenticated track read by id, returning the track's fields only; an unknown id answers 404.
- [ ] The stream and thumbnail answer for an account with no playlist association; retry and fetch-whole still refuse it; a track with no stored media answers 409.
- [ ] `/tracks/T` renders the gallery and starts a one-track bare queue for a stored track, attempting autoplay and falling back to paused.
- [ ] Entry is idempotent when `T` is already the bare current track; a reload restores the queue paused at its position and keeps `/tracks/T`.
- [ ] Starting another queue from the gallery replaces the address to `/`; a failed entry keeps `/tracks/T`.
- [ ] A not-stored, unavailable or unknown track shows the matching notice, starts no queue and leaves the gallery drawn.
- [ ] The track route, server route, player and document title tests cover these; the bare-route e2e journey passes.

## Verification

- `pnpm run build` and `pnpm run lint:check` pass.
- The server track route tests, the track route tests and the bare-route e2e journey pass.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
