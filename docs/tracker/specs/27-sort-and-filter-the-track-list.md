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

## User Stories

1. As an account, I want to sort by the playlist's own order, so that the list reads as the owner built it.
2. As an account, I want to sort newest first, so that the tracks I just added are at the top.
3. As an account, I want to sort oldest first, so that I can walk the playlist in the order it grew.
4. As an account, I want the sort saved, so that it is still there when I return.
5. As an account, I want the sort to be the queue's order, so that the list and the queue agree.
6. As an account, I want the sort to keep the playing track, so that changing it does not restart the music.
7. As an account, I want a refused sort explained, so that I know it did not stick.
8. As an account, I want the chips to count the whole playlist, so that I know what is available to filter to.
9. As an account, I want to filter to failed tracks, so that I can see what needs attention.
10. As an account, I want to filter to pending and downloading, so that I know what is on its way.
11. As an account, I want to filter to unavailable, so that I can see what can never play.
12. As an account, I want an All chip, so that I can return to the whole list.
13. As an account, I want a filtered-empty state with Show all, so that an empty filter is not a dead end.
14. As an account, I want the chips to wrap, so that every state is reachable without a hidden scroll.
15. As an account, I want the controls disabled while shuffled, so that I understand the list is not in its own order.
16. As an account, I want the filter to clear when I leave, so that I return to the whole list.
17. As an account, I want a filter never to change what plays, so that Play still plays the playlist.
18. As a read collaborator, I want the sort disabled rather than hidden, so that I understand the setting exists.
19. As a screen-reader user, I want each chip announced with its state and count, so that I can filter without sight.
20. As a French-speaking account, I want the sheet and chips in French, so that the app stays in my language.

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

## Testing Decisions

- A test earns its place only if it fails when behaviour a person relies on changes. The tests assert that the sort
  writes one value and invalidates the list, that a chip filters the read rather than the page, that the counts do
  not follow the filter, and that both controls are disabled while shuffled. They do not assert the chip's shape or
  the sheet's animation.
- **The controls are tested at the detail's seam** with the list read mocked: the sort sheet's three options, the
  refusal notice, the chips' counts, the filter-empty state with Show all, and the disabled state while shuffled.
  Prior art is the web detail's sort and filter tests.
- **The saved sort's effect on the queue is tested at the player store's seam**, as the web's is.
- **The critical journey is a Maestro flow**: sort newest first, filter to failed, and return to All.
- **Cut tests:** no test of the wrap's layout, the chip's colour, or the sheet's radio styling.

## Out of Scope

- Sorting or filtering the gallery.
- A multi-select filter, a search field, and a saved filter.
- A filter that changes the queue.
- Sorting by title, duration or play count.
- A filter on the association's origin, on the source status, or on the owner.

## Further Notes

- Shipped differently: the owner revised the control block after the tickets landed. The sort and the chips share one
  rail below the header, with a vertical rule between them, and the rail scrolls sideways. The pinned band the spec
  describes, with the sort on its own line and the chips wrapping, is what the resolved tickets were cut against.
