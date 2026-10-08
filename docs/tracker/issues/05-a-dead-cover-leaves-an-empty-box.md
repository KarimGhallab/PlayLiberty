# 05: A dead cover leaves an empty box and calls Google

**State:** `resolved`
**Category:** `bug` (the empty box) with an `enhancement` half (the durable stored cover)

## Outcome

Resolved by
[`10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail`](10-one-artwork-pipeline-the-cover-reuses-the-tracks-thumbnail.md).
The empty-box half is the sleeve fallback on a failed image load, now in `PlaylistHeader`; the durability
half is superseded, because the cover is the first track's stored thumbnail, so there is no separate cover
to store and no third-party request from any client.
