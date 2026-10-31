# 06: The queue follows the playlist

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## Outcome

The queue read now feeds the live queue. When the detail's queue read settles or refetches, it is merged over a queue
that already belongs to the same playlist: known ids keep the order already playing, including a shuffled order, new
ids append in the server's order, and ids the read no longer returns are gone. A read of another playlist is ignored,
so a queue cannot accumulate across playlists, and a read with nothing changed does not update the store.

The source order follows the incoming list, so turning shuffle off restores the playlist's current order. A current
track that remains keeps its position and play state. One that leaves stops playback, clears the position and the
seek request, and removes the bar. Starting another playlist still replaces the queue through `start`. The detail list
still mirrors the queue while shuffle is on.

## Verification

- Mobile 355 tests across 41 suites pass. Store tests cover the merge, the appended track, the shuffled order, a
  retained current track and its position, the removal of the current track, and a foreign playlist. A detail test
  proves the queue read is applied over the live queue.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- The emulator live-read check was not run; the read-to-queue wiring is covered by the detail test.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
