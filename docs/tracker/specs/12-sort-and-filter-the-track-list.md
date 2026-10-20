# Sort and filter the track list

Status: resolved
Labels: `enhancement`

## Problem Statement

The playlist detail draws every track the playlist holds, in the playlist's own order, and nothing can change
that. A listener who wants the tracks added most recently walks the whole list, and a listener looking for the
ones that failed scans every row for a state word. A long playlist makes both worse: the rows that matter are
the ones furthest down.

The order is also forgotten. Even when a listener has arranged a playlist to their liking, opening it again
starts from the playlist's own order, so the arrangement is a per-visit gesture rather than a property of the
playlist.

The third problem is what a sort is allowed to mean. The detail's list is the queue: while unshuffled the rows
are the order that plays, and the screen says so. An order that only re-arranged the drawing would put the list
and the transport out of step, so the saved order has to be the queue's order rather than a decoration over it.

## Solution

The detail's list gains one control row above it. A segmented control sorts by the playlist's own order, newest
first or oldest first, and the choice is saved for that playlist in the database, so it is the order the list
opens in and the order that plays while unshuffled. A row of chips narrows the list to one track state, each
chip carrying how many tracks are in that state across the whole playlist, so the choice is made knowing what
it will show. The filter is a view for the visit; the sort is a property of the playlist.

## Implementation Decisions

- **The saved sort is a per-playlist value, and it is both the list's order and the unshuffled queue's order.**
  It is a new nullable value on the playlist row, following the `skipNonMusic` precedent of a per-playlist
  setting on the playlist row rather than a per-account join, and `null` means the playlist's own order.
  _Decided here:_ per playlist rather than per viewer, so everyone reading the playlist reads one arrangement
  and the value can be the queue's source order.
- **The sort key is the association's added-at.** It is the date the track joined this playlist, which differs
  per playlist for a track held by several. It stays server-side: it is never surfaced on the wire and never
  drawn, because the press asked for an order and not for a new field on the row. The track's own created-at is
  a different fact and is not used.
- **There are three values: the playlist's own order (the default and the null), newest first, oldest first.**
  The playlist's own order stays a first-class choice, so an untouched playlist behaves exactly
  as it does today.
- **Equal dates order by the playlist's own position, ascending.** A sync that adds many rows in one instant
  gives them equal timestamps, and a client that fetched the same page twice must not see the rows swap, so the
  tiebreak is the order the playlist already holds.
- **The list read and the queue read both apply the saved value, with no sort parameter.** The saved value is
  the one source of order, so the two reads cannot disagree and a client cannot ask for an order the playlist
  does not hold. The list read's ordering becomes the saved sort over the position tiebreak, and the queue read
  follows the same ordering.
- **The list read takes an optional track state, and its total is the filtered total.** _Decided here:_ the
  filter is a query parameter rather than a client-side narrowing, so the page's total and the paging walk stay
  honest under a filter instead of walking until enough rows happen to match.
- **The counts are a whole-playlist aggregate folded into the list response.** An unfiltered object keyed by
  the five file states, so the chips and the rows arrive from one read and one invalidation. The page's own
  total stays the filtered total; the counts never follow the filter, because the point of the count is what is
  available to filter to.
- **The identity card states the playlist's own size, and the filter's total stays on the rail.** The card names
  the playlist, so a figure on it is read as the playlist's size; an unqualified "1 track" beside a rail reading
  "All 8" makes a filtered playlist look smaller than it is. The list's paging window is claimed on that card
  only while the list is the whole playlist, because a narrowed list owes a denominator the card does not carry.
  _Revised by [`67`](../issues/67-the-detail-count-follows-the-filter-unannounced.md)._
- **The filter is the five file states, single-select, with an "All".** The states are the ones the row already
  labels: stored, pending, downloading, failed and unavailable. The `sourceStatus: removed` overlay is not a
  bucket, so a stored-but-removed track counts as stored.
- **The filter is client state, held for the visit only.** No URL parameter and no stored value: leaving the
  screen clears it, because the request saved the sort and not the filter. The sort is the one that persists.
- **The sort is saved by a mutation that mirrors the skip-non-music route.** It requires write access (the
  owner or a write collaborator; a read collaborator sees the control disabled, not hidden), validates its
  body, answers the updated playlist, and republishes a playlist-changed event so another client of the same
  playlist refetches. The client's update is optimistic, and it invalidates the playlist and the track reads
  because the order changed. _Decided here,_ on the setting precedent.
- **The sort is the queue's source order while unshuffled.** When the saved value changes, or when a client
  loads, the unshuffled queue is rebuilt in that order with the track that was playing and its position kept. A
  shuffle overrides it, and turning the shuffle off returns to the saved order. This is what
  keeps the list and the queue one order, which is the detail record's own rule.
- **A filter never changes what plays.** Play and shuffle keep covering every playable track, and the queue is
  built from the whole playlist in the saved order. Playing only the filtered rows is not this spec.
- **The controls are one row above the list, and they scroll with it.** A segmented control for the sort and a
  chip row for the filter, horizontally scrollable on a narrow screen rather than wrapped. The row is disabled
  while shuffled, because both controls belong to the unshuffled list.
- **The row does not change.** The added-at date is not displayed, so the row keeps its shape and the contract
  keeps its fields.
- **The copy is the row's own vocabulary.** "Sort by" over "Playlist order", "Newest first" and "Oldest first";
  the chips "All", "Stored", "Pending", "Downloading", "Failed" and "Unavailable"; the empty state "No failed
  tracks" with a "Show all" action. New keys live under the detail namespace, and the stored chip adds the one
  state word the row is silent on.
- **The stale statements are amended as part of the work.** The `03-read-a-playlist` out-of-scope line about
  sorting by anything but position, and the detail record's section on the list's order, point at this spec.
  The library keeps its record that there is no sort, no filter and no pagination, because the library is
  untouched.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded
  edge headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  and the client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- Sorting by any other key: the title, the duration, the sync's own date, or the track's created-at.
- A search, and a multi-select filter.
- A per-viewer sort; the saved value is a property of the playlist.
- A manual reorder, which moves a track's position and is not in v1 at all.
- Saving the filter, in the database or in the URL.
- The library, which keeps no sort, no filter and no pagination.
- Playing only the filtered rows.
- The mobile client's own arrangement; this corpus is web only.
