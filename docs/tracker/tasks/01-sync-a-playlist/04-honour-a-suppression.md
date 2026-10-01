# 04: Honour a removed track

**What to build:** A track the listener removed stays removed. The reconcile skips any video the playlist has
a suppression for, so it is not re-added on the next sync, and a video that returns to the source after its
suppression is gone is associated again. This ticket only reads suppressions; the write that creates one is
removing a track from a playlist, which spec 04 owns.

**Blocked by:** 02.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A video id with a suppression for the playlist creates no association on the next sync.
- [ ] A suppressed video that returns to the source after its suppression is removed is associated again.
- [ ] The reconcile reads suppressions and never writes one.
