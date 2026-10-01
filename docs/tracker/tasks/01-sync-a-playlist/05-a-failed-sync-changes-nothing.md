# 05: A failed sync changes nothing

**What to build:** A sync that cannot read its source refuses rather than guesses. An adapter failure produces
a failed run with a short error and leaves the playlist in `error` with a last-synced time that is not null,
and it changes nothing else: no association is created, no track is marked remote-removed, and no position
moves. A later sync that succeeds reconciles normally. An unreadable source and an empty source must not be
confused, because treating a failure as an empty listing would mark every track in the playlist remote-removed
at once.

**Blocked by:** 03.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] An adapter failure yields a failed run carrying a short error.
- [ ] The playlist's sync status becomes `error` and its last-synced time is set.
- [ ] No association is created, no track is marked remote-removed, and no position moves.
- [ ] A second sync after the failure succeeds and reconciles normally.
