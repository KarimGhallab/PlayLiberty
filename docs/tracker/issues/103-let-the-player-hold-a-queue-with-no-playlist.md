# 103: Let the player hold a queue with no playlist

**State:** `resolved`
**Category:** `enhancement`
**Spec:** [18-share-a-track](../specs/18-share-a-track.md)

## Outcome

A track can now be queued on its own. The player track's playlist id and name are nullable, a store action starts a one-track queue with no playlist context, and the persistence guard accepts the nulls and restores the queue paused at its position. The player bar draws the title only for a bare queue: no source line, no playlist link, and the artwork sits outside a link. Media Session publishes no album, and the document title is `{app} - {track}`, falling back to the app name when no track is current.

Playlist queues keep their existing bar, persistence and title behaviour. No route, link or server change is part of this prefactor; ticket 106 consumes the bare queue.

Verification: `pnpm run build`, `pnpm run lint:check` and the unit suites pass (web 621, server 436, egress agent 54, UI foundation 5). New owner tests cover the bare start, the persistence round trip and paused restore, the bar's title-only identity, the bare document title in both languages, and the empty Media Session album.
