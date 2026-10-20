# 68: The sync band's failure count excludes download failures

**State:** `resolved`
**Category:** `bug`

## Outcome

`SyncSummary`'s failure cell now draws the playlist's live `failed` count from the same tracks read the chip rail and the rows use, so a run that settled cleanly followed by failed downloads reads "4 still failed" beside "Failed 4" rather than "0 failed". The kept, added and removed cells remain the last run's figures, and the stamp now names that measurement (`Last sync 2 hours ago`) instead of leaving the four words unqualified; the failure word itself says `still failed` so it cannot be read as a run outcome. The detail waits for the counts read before drawing the band, because the failure figure no longer exists without it. `SyncRun` is unchanged; the band no longer draws `run.failedCount`. `SyncSummary.test.tsx` holds a settled run with a zero failure figure and a live count of four, and the detail page's test holds the same run beside four failed rows and the `Failed 4` chip. The unused `syncSummary.syncedJustNow` copy is gone, folded into `syncSummary.lastSync`.
