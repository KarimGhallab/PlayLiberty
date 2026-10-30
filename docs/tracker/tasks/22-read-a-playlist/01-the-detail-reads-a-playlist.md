# 01: The detail reads a playlist

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## What to build

The playlist route stops drawing its id and becomes the detail. It reads the playlist, the first page of its tracks
and the latest sync run, and resolves the owner from the account directory.

The screen is one column. The identity block is the first item in the same scroll as the tracks: the playlist cover
from the shared custom, first-track, sleeve chain, the name as the heading, the share mark, the owner line for a
shared playlist, the track count and the sync state with the last-synced stamp. Play and Shuffle are drawn and wait
for `06`. The platform back returns to the gallery; the screen draws no back button.

The route keeps the `playlist-screen` test id the gallery journey already targets. The loading and failure bodies are
`02`; this ticket draws the success path and does not invent a fourth state for a pending read.

## Acceptance criteria

- [ ] The detail draws the cover, name, share mark, owner line, count and sync line from the three reads.
- [ ] A shared playlist names its owner; the account's own playlist draws no owner line.
- [ ] The platform back returns to the gallery.
- [ ] `playlist-screen` remains the route's test id.
- [ ] The identity block and the rows share one scroll; no fixed header covers the list.
- [ ] The new copy renders in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the detail's Jest file, then `pnpm run build` and
`pnpm run lint:check`.
