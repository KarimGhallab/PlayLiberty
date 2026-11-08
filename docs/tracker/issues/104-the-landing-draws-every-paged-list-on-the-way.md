# 104: The landing draws every paged list on the way to the current track

**State:** `resolved`
**Category:** `bug`

## Outcome

Opening the detail while this playlist is the queue no longer draws each page as the landing walk reaches the current track. While that row is beyond the loaded pages, the list is held behind `TrackListSkeleton`; the pages load with the skeleton, then the rows render once and the current row is scrolled into view once. A failed page leaves the skeleton for the retry footer instead of looping.

On the emulator, reopening a 200-track playlist at track 101 still landed on that row.
