# 04: The queue is a sheet above the bar

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

The bar gains a queue control that opens a sheet above it. The sheet lists the queue in the order it will play, with
each track's title and duration, and marks the current row with the same playing word the detail's rows use. A press
moves the playhead to that track and the current mark follows. A long queue scrolls inside the sheet.

The sheet reads the queue the app already holds; it makes no server read. It cannot open when there is no bar, and a
queue with one bare track shows that one row without a playlist name. The queue sheet is the app's only addition to
the web's playback surface, not a second list of the playlist. Both catalogs carry its copy, and a screen reader
hears which row is current.

## Acceptance criteria

- [ ] The bar's queue control opens a sheet listing the queue in its order.
- [ ] The current row is marked with the playing word, and the mark moves with a jump.
- [ ] A press on a queued track makes it current without changing the queue's order.
- [ ] A long queue scrolls without pushing the sheet's title away.
- [ ] A bare queue shows one row and no playlist name.
- [ ] The sheet's copy exists in English and French, and the current row is announced.

## Verification

- Queue sheet component tests cover the order, the current mark, the jump and the bare queue.
- On the emulator: open the queue, jump to a later track, and confirm the bar names that track and the mark follows.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
