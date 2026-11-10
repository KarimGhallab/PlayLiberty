# 01: The saved sort orders the queue

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`applyRefetch` now takes the queue from the read it applies. An unshuffled queue becomes the read's order, so a saved
sort change reorders what plays and not only what is drawn. A shuffled queue keeps the arrangement already playing
and takes only the entries the read returns, with a new id joining at the end in the read's order. `sourceQueue`
holds the read's order in both cases, so turning shuffle off lands on the saved order.

The current track is untouched: it keeps its id and its position whether the queue reordered or stayed shuffled. A
current track the read no longer carries still clears the cursor and stops playback, and a refetch for another
playlist still changes nothing. The list and the queue can no longer disagree while unshuffled.

The store tests cover the unshuffled reorder with the playhead at eight seconds, the shuffled merge with a new
entry, the kept playhead, the removed current track, shuffle off returning to the last read order, and the ignored
other playlist.

See [`27-sort-and-filter-the-track-list`](../../specs/27-sort-and-filter-the-track-list.md).
