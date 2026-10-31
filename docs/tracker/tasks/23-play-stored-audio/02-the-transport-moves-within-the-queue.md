# 02: The transport moves within the queue

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

The bar's transport becomes previous, play-pause and next in one place; the detail header does not repeat them. Next
moves one entry and is disabled at the last entry, where it does not wrap. Previous restarts the current track when
it is already past the first five seconds, and otherwise moves to the previous entry; at the first entry it restarts.

A skip starts the track it lands on, whether the bar was playing or paused. Each control names the track it acts on,
and the disabled next control announces its state. The queue's current mark and the bar's title follow every move.
Both catalogs carry the transport copy.

## Acceptance criteria

- [ ] Previous, play-pause and next exist only in the bar.
- [ ] Next moves one entry and is disabled at the last one.
- [ ] Previous moves one entry early in a track, restarts it later, and restarts the first entry rather than moving.
- [ ] A skip plays the track it lands on.
- [ ] Every control names the current track, and the disabled state of next is announced.
- [ ] The transport copy exists in English and French.

## Verification

- Store and bar unit tests cover the ends, the grace window and the disabled state.
- On the emulator: step through a queue to its last entry, then step back and restart a track from the middle.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
