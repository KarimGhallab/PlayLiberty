# Sort and filter the track list on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A playlist of three hundred tracks is read on a phone by scrolling, and the app has no way to order it or to narrow
it. The web client has a saved sort and five status chips with counts; on a phone both controls must live in a row
that stays reachable, and a chip row that clips hides the state a person is looking for.

## Solution

A sort sheet with three radios and a chips row that sticks under the top inset. The sort is the playlist's saved
value and it is also the unshuffled queue's order; the chips are the five file states plus All, with whole-playlist
counts, and they wrap rather than scroll. A filter with no rows says so and offers Show all. Both controls are
disabled while the list is shuffled.

## Implementation Decisions

- **The sort is a sheet with three radios: Playlist order, Newest first, Oldest first.** It writes the playlist's
  saved value through the same mutation the web uses, and the change is optimistic with the reads invalidated because
  the order moved. `Decided here:` a sheet rather than a segmented control, because three radio rows are readable at
  a thumb and a segmented control of three long labels is not.
- **The sort is the unshuffled queue's source order, and a change keeps the playing track and its position.**
- **The chips are the five file states plus All, single-select, and they wrap to the full width.** The counts come
  from the whole-playlist aggregate in the list read, never from the filter. `Decided here:` the design record's
  phone rule, kept rather than a scrolling rail.
- **The filter is client state for the visit.** Leaving the screen clears it; the sort is the one saved value.
- **The filter is the list read's query parameter**, so the total and the paging walk stay honest under a filter.
- **Both controls are disabled while the list is shuffled**, because both belong to the unshuffled list. A read
  collaborator sees the sort disabled, not hidden.
- **The filtered-empty state names the state and offers Show all.** The copy is the catalogs' existing keys; this
  spec adds no sentence.
- **The filter never changes what plays.** Play and Shuffle keep covering every playable track and the queue is built
  from the whole playlist in the saved order.
- **The controls stick under the top inset while the list scrolls.** `Decided here:` the detail's identity block
  scrolls away, so the sort and the chips are the only controls a long list needs on screen.
- **Inherited decisions are referenced, not restated:** the saved value and its three options, the added-at key, the
  equal-date tiebreak, the counts' aggregate, the filter's query parameter and the disabled-while-shuffled rule are
  [`12-sort-and-filter-the-track-list`](12-sort-and-filter-the-track-list.md)'s.
- **The shipped control block is one rail below the header.** The arrangement is [DESIGN.md's](../../DESIGN.md#the-mobile-client).

## Out of Scope

- Sorting or filtering the gallery.
- A multi-select filter, a search field, and a saved filter.
- A filter that changes the queue.
- Sorting by title, duration or play count.
- A filter on the association's origin, on the source status, or on the owner.
