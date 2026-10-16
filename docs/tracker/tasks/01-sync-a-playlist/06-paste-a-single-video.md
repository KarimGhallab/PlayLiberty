# 06: Paste a single video URL

**Status:** resolved

## Outcome

Verified with no production change: the create path from ticket 01 already accepts a video URL. The URL
validator returns a video source for a watch or youtu.be link, and the reconcile reads whatever the stored
source URL points at, so a video source produces a one-entry reading and one remote association at position 0.
The playlist takes its source id from the video id, its name from the video's title and its cover from the
video's thumbnail, and the per-owner source uniqueness makes a re-post return the same playlist. The resulting
playlist re-syncs like any other, adding nothing on a second pass.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
