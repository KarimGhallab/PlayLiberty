# 07: The list pages and lands

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The tracks read is an infinite read. The next offset is the loaded count, the loaded pages flatten into the one list
the rows draw, and the first page keeps the whole-playlist counts. Scrolling near the bottom asks for the next page
with no Load more control, and the walk stops at the total. A page in flight draws its translated footer, and a failed
page offers Try again rather than retrying itself in the background.

Opening the detail while this playlist is the queue captures its current track once. While that row is beyond the
loaded pages, the list is held behind the skeleton; the pages load behind it, then the rows render once and the
current row is scrolled into view once from its own layout. A failed page leaves the skeleton for the retry footer.
Later starts and skips do not move the list under the reader. The list reserves the add action's height under its
last row; the player bar's reserve arrives with spec `23`.

Verification also found that the row's play layer sat under its content, so a tap on the title or artwork never
reached it on the device. The non-interactive content now passes through to the play layer, while the failure
disclosure and selectable reason stay interactive.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
