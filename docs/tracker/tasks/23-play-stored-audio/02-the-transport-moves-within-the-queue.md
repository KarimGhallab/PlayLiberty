# 02: The transport moves within the queue

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The store now reports the player's position, and its transport rules live beside the queue. `skipNext` moves one entry
and starts it, and does nothing at the last entry. `skipPrevious` moves back when the track is inside its first five
seconds, otherwise it restarts the current track; at the first entry it restarts rather than moving before the queue.
Every skip clears the position and starts the track it lands on, whether the bar was playing or paused. A position
change reports once per player update, so a stale position from the previous source is not read onto the new track.

The bar's transport is previous, play-pause and next in one group. Every control carries the current track's title in
its label, and next is disabled and announced as disabled at the last entry. The detail header still carries only its
Play and Shuffle controls. The transport copy exists in both catalogs.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
