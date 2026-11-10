# 02: The notification's transport drives the queue

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The service contract now carries the current position, the track duration and whether previous and next are available.
The notification builds previous, play-pause and next, and its media session publishes the same transport actions plus
seek. The seek position and duration are in the session metadata and playback state, so the shade's media card draws
the progress rail. Next is omitted when the queue ends, and the session drops its skip-next action at the same time.

Commands come back through the same store actions the bar uses: previous calls `skipPrevious`, next calls `skipNext`,
play and pause call `setPlaying`, and a seek is converted to a bounded `seekToFraction`. There is no second queue or
play state in the service.

Position is mirrored once per whole second to keep the notification current without a 500 ms service write. The
service updates the media session on every state update but only rebuilds the foreground notification when a visible
fact changes.

See [`24-play-in-the-background`](../../specs/24-play-in-the-background.md).
