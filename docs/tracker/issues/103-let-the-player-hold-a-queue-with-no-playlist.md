# 103: Let the player hold a queue with no playlist

**State:** `ready-for-agent`
**Category:** `enhancement`
**Spec:** [18-share-a-track](../specs/18-share-a-track.md)
**Blocked by:** None. Can start immediately.

## What to build

The player can hold, draw and restore a one-track queue with no playlist. A track started on its own carries no playlist id or name, the player bar draws the title only and offers no way into a playlist, the Media Session names no album, and the tab title is `{app} - {track}`. Every playlist queue keeps its current behaviour. No route, link or server change is part of this ticket; it is the prefactor the track route needs.

## Acceptance criteria

- [ ] A store action starts a one-track queue with no playlist context, playing at position zero, and the queue's playlist id reads as null.
- [ ] The persistence guard accepts that queue and restores it paused at its position; a reload does not start audio.
- [ ] The player bar draws the title only for a bare queue, with no source line, no playlist link and an inert artwork link.
- [ ] The Media Session publishes no album for a bare track, and the document title is `{app} - {track}`; a missing track uses the app name.
- [ ] A playlist queue keeps its current bar, persistence and title behaviour.
- [ ] The store, persistence, bar and document title tests cover both the bare and the playlist cases.
