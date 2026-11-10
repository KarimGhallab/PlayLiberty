# 03: Start playback through one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`apps/mobile/src/player/startPlayback/` exports `startAtPlaylist`, `startAtTrack`, `startBareTrack`, `applyPlaylistRefetch` and `playableTracks`. The module reads the queue through the query client, filters the stored tracks, maps the player tracks, reuses a queue the playlist already owns, and returns the refusal vocabulary.

The playlist detail's shared link, row press, header play and header shuffle use it. The gallery's card play and shuffle use it. The bare-track entry uses it. The old `startPlaylistPlayback` module and its exported read helper are deleted. The detail's queue re-apply now goes through the module's playable filter and mapping.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit` (mobile 618, web 616, server 504, and the other packages), and the targeted mobile suites for the detail, gallery, bare entry, player store and start module.

See [`mobile-architecture-review`](TICKETS.md).
