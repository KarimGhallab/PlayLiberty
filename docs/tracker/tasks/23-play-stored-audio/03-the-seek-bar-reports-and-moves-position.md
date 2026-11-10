# 03: The seek bar reports and moves position

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The store owns the seek. A request is bounded to the current track's declared duration, written into `positionSeconds`
and left in a transient `seekTo` that the player consumes once. `seekToFraction` takes the rail's fraction,
`seekBy` steps by seconds, and an unknown or zero duration leaves both inert. Player progress is bounded the same way,
so the status and the rail cannot disagree about the track's end.

The audio layer applies a pending seek with the player's own `seekTo` and clears the request first, so the player
reporting its progress is not read as another request.

The bar's second row shows the elapsed time, the rail and the total duration. A drag reports its target, asks the bar
to hold the player paused, and seeks once on release; a player that was playing resumes and a paused one stays paused.
The rail is adjustable to a screen reader, reports the elapsed and total time, and its two actions move ten seconds.
Without a duration it is inert. The copy exists in both catalogs.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
