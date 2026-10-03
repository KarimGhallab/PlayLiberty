# 02: The audio element and the browser controls

**What to build:** One audio element plays exactly one track at a time, through the stream route, derived from
the track id at the moment it is reached. Skip forward and back move the current index within the queue and stop
at the ends rather than wrapping; finishing the last track stops rather than looping. Pause and resume keep the
place, and seeking sets the element's position rather than waiting for the file. The volume is stored and
applied. The browser's own media controls are driven from the same player state, both ways, behind feature
detection and never allowed to throw past the player, so a browser without the API loses the controls and
nothing else. Nothing is prefetched: the next track is requested when the current one ends.

**Blocked by:** [`01`](01-build-the-queue-and-play-it.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] Exactly one track plays at a time, and the track's stream address is derived from its id when it is reached.
- [ ] Skipping forward and back moves within the queue and stops at the ends rather than wrapping.
- [ ] Pause and resume keep the position, and seeking sets it immediately.
- [ ] The Media Session reflects the player state and drives it in both directions.
- [ ] A browser without the Media Session API loses the controls rather than throwing.
- [ ] The network log for playback holds the reads and the stream and nothing else, and no track is prefetched.
