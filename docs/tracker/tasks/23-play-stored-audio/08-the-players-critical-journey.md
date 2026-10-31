# 08: The player's critical journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-transport-moves-within-the-queue.md)

## Outcome

`player-journey` stops and relaunches the app, signs in through the existing fallback when needed, opens the playlist
named by `OWNED_PLAYLIST`, and starts its queue from the first playable row. It advances once from the bar, copies a
later row's title from the track list, presses that row as the jump, and asserts the bar's own title carries the copied
name. Back returns to the gallery with the bar still visible, where the flow ends.

The track list is the queue, so the row press is the jump. Selectors are test ids, and the bar assertion combines
`player-title` with the copied text, so it cannot pass on the row alone. The README records the row and the
`OWNED_PLAYLIST` requirement of an owned playlist with at least three playable tracks.

## Verification

- The flow passed alone twice against the French device, then passed beside `detail-play` in both orders:
  `2/2` in 2m 20s and `2/2` in 2m 17s.
- `OWNED_PLAYLIST=Paradis` was used for every run.
- No source changed, so the mobile suite and build were not rerun for this ticket.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
