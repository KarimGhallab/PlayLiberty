# 05: A dead cover leaves an empty box and calls Google

**State:** `resolved`
**Category:** `bug` (the empty box) with an `enhancement` half (the durable stored cover)

## Outcome

Resolved by [`10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail`](10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail.md). The empty-box half is the sleeve fallback on a failed thumbnail load, now in `PlaylistHeader`. The durability half was closed as superseded at the time, because the cover was the first track's stored thumbnail; [`14-upload-a-playlist-cover`](../specs/14-upload-a-playlist-cover.md) restores a separate stored cover above that fallback.
