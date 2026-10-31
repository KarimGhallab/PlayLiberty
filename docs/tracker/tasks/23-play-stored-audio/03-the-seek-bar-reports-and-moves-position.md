# 03: The seek bar reports and moves position

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

The bar shows the elapsed time and the track's duration, and a rail whose fill follows the current position. Dragging
the rail reports the target while the gesture is live, holds the player paused, and seeks once on release; a player
that was playing resumes, and a paused one stays paused. The target is bounded to the track, and an unknown or zero
duration leaves the rail inert.

The seek belongs to the store and is applied once by the player, so the player reporting its own progress never
feeds a jump back into it. The rail is adjustable to a screen reader: it reports the elapsed and total time, and its
forward and backward actions move ten seconds. The labels and the value text are in both catalogs. There is no
volume rail and no mute.

## Acceptance criteria

- [ ] The bar reports elapsed and total time from the player's own position.
- [ ] A drag reports its target, pauses the player while held, and seeks once on release.
- [ ] A playing player resumes after the seek; a paused player stays paused.
- [ ] A target outside the track is bounded, and an unknown duration leaves the rail inert.
- [ ] A screen reader can adjust the rail by ten seconds in either direction and hears the elapsed and total time.
- [ ] The seek copy exists in English and French.

## Verification

- Store and bar unit tests cover the bound, the single application and the accessibility actions; no test of the
  rail's pixel mapping.
- On the emulator: seek near the end of a track, let it finish, and seek while paused and while playing.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
