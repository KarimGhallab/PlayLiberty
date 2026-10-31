# 06: The header plays and shuffles

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-track-rows-draw-and-play.md)

## Outcome

Play starts the playlist at its first playable track from the whole queue route, never from the loaded page. Shuffle
draws one playable track at random and starts the whole playable order shuffled, with that track at the front. A read
that has not landed is awaited, both controls wait while it is in flight, and an empty queue disables both. A failed
read is the start's notice in both catalogs.

The player store now carries the source order and the shuffle flag. Turning shuffle off restores the saved order and
keeps the playhead; the list draws the shuffled queue's order while this playlist is the queue, and the saved order
again when shuffle is off. The mirror survives leaving and returning to the screen, and the shuffle control shows its
selected state. Every access level may start.

A row press on a queue that is already this playlist moves the playhead in place, so a shuffled order survives the
press rather than being rebuilt. The header still draws no transport; that is spec `23`'s.

No new message keys were needed: the start's empty and unreachable sentences already existed in both catalogs.

## Verification

- Queue order 3 tests, player store 12 tests and detail 47 tests pass.
- Mobile 239 tests across 32 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, Play marked the first row as playing, Shuffle reordered the list with the drawn row first, and a
  second press restored the saved order. Reopening the playlist after leaving it kept the shuffled order, the current
  row and the shuffle control's selected state.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
