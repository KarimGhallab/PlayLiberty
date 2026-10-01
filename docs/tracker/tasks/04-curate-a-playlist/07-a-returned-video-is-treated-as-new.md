# 07: A returned video is treated as new

**What to build:** A suppression is not permanent. On a sync, a suppressed video that the source still lists
stays removed, but a suppression whose video the source no longer lists is lifted, so if the video later comes
back it is associated again. Removing a track is then a choice about what is in the playlist now, not a
deletion of the video forever. This changes the reconcile from reading suppressions to reading and lifting
them, which overrides spec 01's ticket 04 criterion that the reconcile never writes one; that ticket's
behaviour for a video still in the source is unchanged, and it stays not re-added.

**Blocked by:** [`05`](05-remove-a-track-from-a-playlist.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A suppressed video the source still lists is not re-associated, and its suppression survives the sync.
- [ ] A suppression whose video is absent from the source is lifted by the sync.
- [ ] A video that left the source and returned after its suppression was lifted is associated again.
- [ ] Removing a track and then syncing while the video is still present keeps it removed.
