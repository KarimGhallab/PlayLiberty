# 04: Honour a removed track

**Status:** resolved

## Outcome

The reconcile checks each source video for a suppression on the playlist before it does anything else, so a
suppressed video creates no track and no association at all, and lifting the suppression lets the next sync
associate the video again. The check is a single lookup against the suppression primary key, and the reconcile
creates no suppression of its own: the seeded row count is unchanged after a sync, and syncs on a playlist with
no suppressions leave none behind. Superseded in part by ticket 07 of
[`04-curate-a-playlist`](../04-curate-a-playlist/07-a-returned-video-is-treated-as-new.md), which gives the
reconcile one write: it lifts the suppression of a video the source no longer lists, so a removal does not
outlive the video and a video that returns is associated again. The reconcile still creates no suppression, and
a suppressed video the source still lists stays removed.

See [`01-sync-a-playlist.md`](../../specs/01-sync-a-playlist.md).
