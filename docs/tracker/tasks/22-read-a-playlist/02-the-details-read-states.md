# 02: The detail's read states

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The detail now draws one body for each read outcome.

A pending playlist read draws the row skeleton under the route's frame, announced once as "Loading tracks." with the
placeholders hidden from the accessibility tree. The identity block stays absent until the playlist read lands. A
pending tracks read under a loaded identity draws the same skeleton in the tracks area.

A 404 on the playlist draws the playlist not-found body with the `notFound` heading, prose and one back action to the
gallery. It offers no retry. Any other playlist failure draws the read-failure body with the problem's detail, the
detail's read-failed copy as the fallback and a retry that refetches the playlist read. A failed tracks read draws
its own read-failure body under the identity with its own retry.

A never-synced playlist with no tracks draws the empty state: the heading, the synced promise and the product promise.
An owner or a write collaborator gets Sync now, centered under the copy and carrying the loop sync icon, with the
spinner while it runs. It reports its in-flight state from the mutation, the latest run or the playlist's own syncing
status. A read collaborator sees the same body without the control. A synced playlist with no tracks says there are
no tracks.

The write check moved into one shared access helper, which the later detail sheets reuse. The route now supplies the
not-found back action, which replaces the detail with the gallery.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
