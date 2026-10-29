# 05: Resolve a shared link that cannot open its playlist

**Status:** resolved

## Outcome

A shared link always resolves. A playlist 404 on a link hops silently to `/tracks/T`, which plays the track alone over the gallery. A reachable playlist that no longer associates the track replaces the address with `/tracks/T` and says the track left the playlist; a track that cannot play there gets the cannot-play reason instead. A reachable playlist whose track cannot play stays on the playlist, starts nothing, leaves the current queue playing and explains the reason; the link param settles away. Only a 404 falls back: a 5xx or unreachable read is the normal failure with its retry, never the bare track.

The link decisions and the cannot-play wording are shared by the playlist entry and the bare route. The notices use the refusal surface and withdraw on its window; they never interrupt playback.

Verification: `pnpm run build`, `pnpm run lint:check`, the unit suites (web 645, server 438, egress agent 54, UI foundation 5) and the e2e typecheck pass. Five `share-track` e2e journeys pass in Chromium: the read share, the bare track URL, no playlist access, a track that left the playlist, and a track that cannot play. The playlist detail page tests cover the 404 hop, the 5xx playlist and queue retries, the absent hop with its history state, and the unplayable notice; the track page test covers the left-playlist notice.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
