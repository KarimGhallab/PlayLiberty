# 10: Share the gallery view model

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/library` exports `TRACK_STATUSES`, `statusTotals` and `groupPlaylists`, plus the `StatusTotals` and `PlaylistGroups` types. `statusTotals` sums the five buckets and the retained count. `groupPlaylists` returns the pinned, syncing and rest groups, with a pin outranking a running first sync.

The web library page and the mobile gallery import both selectors. Their local `scopeTotals` functions, status constants and grouping filters are deleted.
