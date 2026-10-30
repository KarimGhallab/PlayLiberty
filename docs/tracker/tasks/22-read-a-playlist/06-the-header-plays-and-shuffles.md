# 06: The header plays and shuffles

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-track-rows-draw-and-play.md)

## What to build

Play starts the playlist at its first playable track. Shuffle starts it at a random playable track and lays the whole
playable order out shuffled. Both read the playlist's queue route before starting, so the queue is the whole playlist
and not the loaded page; the control reports its wait while the read is pending. An empty queue disables both. A
failed queue read is a notice.

While this playlist is the queue and shuffle is on, the list draws the queue's order. Turning shuffle off restores
the saved sort's order. The queue store carries the shuffle flag, so the mirror survives a return to the screen. The
row's current mark follows the store.

The transport (previous, play-pause and next) is spec `23`'s, so the header does not repeat it. Every access level may
start.

## Acceptance criteria

- [ ] Play starts the queue at the playlist's first playable track.
- [ ] Shuffle starts at a random playable track and its order contains every playable track exactly once.
- [ ] The list draws the queue's order while this playlist is shuffled, and restores the saved order when shuffle is
      turned off.
- [ ] An empty queue disables both controls; a failed queue read is explained.
- [ ] The controls report their wait and render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the player store's and detail's Jest files, then `pnpm run build`
and `pnpm run lint:check`.
