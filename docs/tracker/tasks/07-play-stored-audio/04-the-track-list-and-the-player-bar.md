# 04: The track list and the player bar

**What to build:** The two surfaces that make the player usable by hand. The playlist detail's track list is the
queue's surface and the place a track is chosen, with the play control present exactly when a track is playable
and absent, not disabled, when it is not. The player bar shows the current track, the position and the
transport, names the playlist the queue came from, and appears only when something is playing rather than at
rest. The bar persists across both routes, so music keeps playing while the listener browses elsewhere. This is
the ticket with a demo, and it carries the spec's own verification: a real seek against a real stored file in a
real browser, because a fake audio element cannot prove that one.

**Blocked by:** [`01`](01-build-the-queue-and-play-it.md), [`02`](02-the-audio-element-and-the-browser-controls.md), [`03`](03-skip-what-cannot-be-played.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The playlist detail lists its tracks and a playable track is where play starts.
- [ ] An unplayable track shows no play control rather than a disabled one.
- [ ] The player bar shows the current track, the position and the transport, and names the playlist the queue came from.
- [ ] The bar appears only when something is playing and is absent at rest.
- [ ] The bar and the audio element persist across a route change, so playback survives browsing elsewhere.
- [ ] A real seek against a real stored file in a real browser is immediate, checked by hand and recorded.
