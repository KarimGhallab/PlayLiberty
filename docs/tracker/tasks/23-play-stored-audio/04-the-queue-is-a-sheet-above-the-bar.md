# 04: The queue is a sheet above the bar

**Status:** wontfix
**Labels:** `enhancement`, `wontfix`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## Why it is not planned

As of now, the track list is the queue. A separate sheet would draw the same tracks twice, and the detail already
marks the current row and lets a press move the playhead. The bar keeps the transport and the seek; it gains no queue
control.

This ticket is not planned. If a future queue can diverge from the visible track list, the surface can be reconsidered
then.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
