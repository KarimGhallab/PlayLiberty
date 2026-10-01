# 01: Prune the orphaned tracks

**What to build:** The disk is reclaimed after a listener drops the last reference to a track. The prune finds
tracks that no playlist associates any more, removes their audio and their thumbnail, and only then removes the
track, one transaction per track so a crash between the two is impossible. An orphan is a track with zero
associations and nothing else: a track with one association survives entirely, with its file intact, whatever
its file status and whatever its source status, including a remote-removed stored track that is still in a
playlist and a track held only through another account's playlist. A track that is currently downloading is
skipped, because the worker holds a file it is writing. A track whose media cannot be removed keeps its row and
its reason is logged, and a later run reclaims it once the file is gone. The return is the number of tracks
actually removed, and a run that finds nothing removes nothing and returns zero.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A track with no associations has its row, its audio file and its thumbnail removed.
- [ ] A track with one association survives entirely, with its file intact, whatever its file status and whatever its source status.
- [ ] A remote-removed stored track that is still in a playlist survives, and so does a track held only through another account's playlist.
- [ ] A failed track with no associations is removed.
- [ ] A downloading track is skipped and survives.
- [ ] A track whose media cannot be removed keeps its row, logs the reason, and is removed on a later run once the file is gone.
- [ ] Removing the last association to a track does not remove anything immediately, and the next run does.
- [ ] A run that finds nothing removes nothing and returns zero.
- [ ] The returned count equals the number of tracks actually gone.
- [ ] A track that only a suppressed video would re-add is still an orphan, since suppression is not a reference.
