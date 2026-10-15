# Sort and filter the track list

Status: ready
Labels: `enhancement`, `ready-for-agent`

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

## User Stories

1. As a listener, I want to sort a playlist by the date its tracks were added, so that the newest arrivals are
   at the top.
2. As a listener, I want the oldest first as well, so that I can walk a playlist in the order it grew.
3. As a listener, I want the playlist's own order to stay a choice, so that I can get back to the order the
   playlist holds.
4. As a listener, I want the sort remembered for that playlist, so that I do not set it on every visit.
5. As a listener, I want the saved sort applied when I open the playlist, so that the list is in the order I
   left it.
6. As a listener, I want the sort to be the playback order while unshuffled, so that "next" follows what I see.
7. As a listener, I want the track that is playing to keep playing when I change the sort, so that the music
   does not jump.
8. As a listener, I want a shuffle to override the sort, so that a shuffle is a fresh order whatever the sort.
9. As a listener, I want turning the shuffle off to return to the saved sort, so that my arrangement is not
   lost to a shuffle.
10. As a listener, I want a date sort to be stable when several tracks share a timestamp, so that the rows do
    not swap between visits.
11. As a listener, I want a playlist I have never sorted to open in its own order, so that nothing changes
    underneath me.
12. As a listener, I want to narrow the list to one track state, so that I can find the failed ones to retry
    without scanning.
13. As a listener, I want to see how many tracks are in each state before I click, so that I choose knowing
    what the list will hold.
14. As a listener, I want an "All" that clears the filter, so that I get back to the whole list in one action.
15. As a listener, I want the counts to cover the whole playlist rather than the rows loaded so far, so that
    the number is the truth and not a window.
16. As a listener, I want the header's count line to describe the filtered list, so that it does not claim rows
    the filter removed.
17. As a listener, I want a named empty state when a filter matches nothing, so that I am not staring at a
    blank list.
18. As a listener, I want the filter to clear when I leave the screen, so that I do not come back to a
    half-empty list by surprise.
19. As a listener, I want the filter to apply only while unshuffled, so that a shuffle shows the whole shuffled
    queue and not a narrowed one.
20. As a listener, I want play and shuffle to keep covering the whole playlist, so that a filter changes what I
    see and not what plays.
21. As a listener, I want the controls above the list, so that they are found once rather than hunted for.
22. As a listener, I want the controls disabled while shuffled, so that they do not lie about the order on
    screen.
23. As a listener on a phone, I want the control row to scroll sideways rather than wrap, so that the list
    stays close to the top.
24. As a listener, I want the control row to scroll away with the list, so that the header stays the only
    sticky band.
25. As a write collaborator, I want to change a playlist's saved sort, so that I can arrange a playlist I help
    curate.
26. As a read collaborator, I want to see the saved order and a disabled control, so that I understand why the
    list is in that order.
27. As an owner, I want the sort to be a property of the playlist, so that everyone who reads it sees one
    arrangement.
28. As an account, I want a playlist I cannot see to answer the same as one that does not exist, so that the
    route does not confirm what I cannot reach.
29. As a developer, I want the saved order read by the same route that returns the rows, so that there is one
    source of order and the list and the queue cannot disagree.
30. As a developer, I want the counts in the list response, so that the chips and the rows come from one read
    and one invalidation.
31. As a developer, I want the corpus's stale scope statements amended, so that the documentation does not
    contradict the product.

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
  _Decided here._ The playlist's own order stays a first-class choice, so an untouched playlist behaves exactly
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
  available to filter to. _Decided here._
- **The filter is the five file states, single-select, with an "All".** The states are the ones the row already
  labels: stored, pending, downloading, failed and unavailable. The `sourceStatus: removed` overlay is not a
  bucket, so a stored-but-removed track counts as stored. _Decided here._
- **The filter is client state, held for the visit only.** No URL parameter and no stored value: leaving the
  screen clears it, because the request saved the sort and not the filter. The sort is the one that persists.
- **The sort is saved by a mutation that mirrors the skip-non-music route.** It requires write access (the
  owner or a write collaborator; a read collaborator sees the control disabled, not hidden), validates its
  body, answers the updated playlist, and republishes a playlist-changed event so another client of the same
  playlist refetches. The client's update is optimistic, and it invalidates the playlist and the track reads
  because the order changed. _Decided here,_ on the setting precedent.
- **The sort is the queue's source order while unshuffled.** When the saved value changes, or when a client
  loads, the unshuffled queue is rebuilt in that order with the track that was playing and its position kept. A
  shuffle overrides it, and turning the shuffle off returns to the saved order. _Decided here._ This is what
  keeps the list and the queue one order, which is the detail record's own rule.
- **A filter never changes what plays.** Play and shuffle keep covering every playable track, and the queue is
  built from the whole playlist in the saved order. Playing only the filtered rows is not this spec.
- **The controls are one row above the list, and they scroll with it.** A segmented control for the sort and a
  chip row for the filter, horizontally scrollable on a narrow screen rather than wrapped. The row is disabled
  while shuffled, because both controls belong to the unshuffled list. _Decided here._
- **The row does not change.** The added-at date is not displayed, so the row keeps its shape and the contract
  keeps its fields.
- **The copy is the row's own vocabulary.** "Sort by" over "Playlist order", "Newest first" and "Oldest first";
  the chips "All", "Stored", "Pending", "Downloading", "Failed" and "Unavailable"; the empty state "No failed
  tracks" with a "Show all" action. New keys live under the detail namespace, and the stored chip adds the one
  state word the row is silent on.
- **The stale statements are amended as part of the work.** The `03-read-a-playlist` out-of-scope line about
  sorting by anything but position, and the detail record's section on the list's order, point at this spec.
  The library keeps its record that there is no sort, no filter and no pagination, because the library is
  untouched. _Decided here._
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded
  edge headers and fail-closed
  ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)),
  and the client header with the origin check on every mutation
  ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Testing Decisions

- **No new seam on either side, and the assembled product keeps its browser journey.** The server keeps its
  route seam: the real app over a temporary database, exercised through HTTP injection, with accounts,
  playlists, tracks and associations seeded directly. The web keeps its detail-page seam: the page rendered
  through the query provider against a mocked network. The store's own ordering rule is extended in the unit
  tests it already has rather than given a new home. The e2e suite gains one journey file, which is the seam the
  assembled product has always had.
- **The end-to-end journey must exist, because three of these facts are only true once assembled:** the saved
  sort is applied by the server and read again after a reload, the counts describe the whole playlist rather
  than the rows drawn, and the controls go inert while the shuffled queue takes over. It seeds one playlist with
  several stored tracks and one that fails to download, so the list holds two states at once, and it asserts:
  the chips carry the whole-playlist counts before any press; choosing newest first re-orders the list and the
  choice survives a reload; oldest first reverses it; the playlist's own order is reachable again; a chip
  narrows the list and the header's count line, and "All" restores both; a state with no rows draws the named
  empty state; the controls are disabled while shuffled and the list draws the shuffled order; and the saved
  sort is the order the transport walks while unshuffled. The browser is the owner, so the read-collaborator
  gating stays in the route and component tests, exactly as the skip-non-music journey leaves it.
- **What makes a good test here** is the order and the set of rows a reader gets, never the query or the
  component's internals. A test that asserts the saved value was read is a test of the implementation; one that
  asserts the newest row is first once the sort is saved is the feature.
- **The cases that must exist:**
  - the list read returns the playlist's own order with no value saved, newest first after one value, oldest
    first after the other, and the playlist's own order within one timestamp;
  - the queue read returns the same order as the list read;
  - the state parameter narrows the page and its total, and no parameter returns every state;
  - the counts cover the whole playlist and do not follow the filter;
  - the mutation saves the value and answers the playlist; the owner and a write collaborator may, a read
    collaborator is refused, and a playlist the account cannot see answers `404`;
  - an unknown sort value is a validation failure;
  - the control row draws the saved order and the chips with the whole-playlist counts;
  - choosing a sort saves it and re-orders the list, keeping the track that was playing;
  - a chip narrows the list and the header's count line, and "All" restores both;
  - a filter that matches nothing draws the named empty state and its action;
  - the controls are disabled while shuffled, and the list draws the shuffled queue's order;
  - a read collaborator sees the controls disabled;
  - the unshuffled queue adopts the read's order with the playhead kept, and a shuffled queue keeps its own
    order across the same read.
- **Prior art:** the shuffle journey, which is the closest assembled-product test and already proves that the
  row pressed, the row drawn and the track sounding are one track; the skip-non-music journey, which is the
  per-playlist setting precedent for a value that round-trips and survives a reload; the playlist route tests,
  which seed accounts and validate against the contract schemas; the skip-non-music route and its client hook;
  and the detail page tests, which render the page against the mocked network and assert the store's queue
  order.

## Out of Scope

- Sorting by any other key: the title, the duration, the sync's own date, or the track's created-at.
- A search, and a multi-select filter.
- A per-viewer sort; the saved value is a property of the playlist.
- A manual reorder, which moves a track's position and is not in v1 at all.
- Saving the filter, in the database or in the URL.
- The library, which keeps no sort, no filter and no pagination.
- Playing only the filtered rows.
- The mobile client's own arrangement; this corpus is web only.

## Further Notes

- **The one-verb convention tension.** The specs tracker says one spec is one user-visible verb, and this is
  two. It is one spec because the two controls ship as one row, share the reads (the counts and the paging),
  and share the rule that both belong to the unshuffled list. If the corpus is to stay strict, split it into a
  sort spec and a filter spec along the Implementation Decisions seam.
- **This spec does not reorder the playlist.** The corpus lists reordering a playlist as out of scope, and this
  leaves the association positions untouched: the saved sort is an order the list and the queue are read in,
  not a new stored sequence. A later manual reorder would write positions, which is a different feature.
- **The counts are a second read of the same table as the list.** A very large playlist pays one aggregate per
  list read. That is accepted, because computing the counts from the loaded pages is wrong the moment the list
  pages, and the number is the reason the chips exist.
