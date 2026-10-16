# 06: The arranging journey

**Status:** resolved

## Outcome

`e2e/tests/arrange.spec.ts` is the assembled-product journey, three tests against one seeded playlist: three stored tracks and one that fails to download, so the list holds two states at once. The seed is load-bearing: associations are made one at a time, the first by sync and the rest through the add dialog, because distinct added-at times are what make the date sort a different order from the playlist's, and the failed track is added last so it is the newest. The tests prove the saved sort re-orders the list (newest first reverses it), survives a reload, and is the order the unshuffled transport walks (the first playable is C, then B, then A, because the failed row cannot be queued, with oldest first reversing it and the playlist's own order reachable again); the chips carry the whole-playlist counts before any press (All 4, Stored 3, Pending 0, Downloading 0, Failed 1, Unavailable 0) and a chip narrows the list and the header's count line to the filtered total while the counts stay the whole playlist's; and the controls go inert while shuffled, with the list drawing the shuffled queue's order. `curate.spec.ts` and `live.spec.ts` needed their "Failed" and "Downloading" selectors scoped to the row or the track list, because the new chips carry the same words the track rows do.

See [`12-sort-and-filter-the-track-list`](../../specs/12-sort-and-filter-the-track-list.md).
