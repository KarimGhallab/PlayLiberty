# Read a playlist on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The playlist detail is where stored tracks become audible, and on a phone the web client's two-column arrangement
does not exist: there is one column, a thumb, a scroll that can run to hundreds of rows, and a player bar that owns
the transport. Nothing decides what stays on screen while the list scrolls, how a long list is walked, what a
playlist the account cannot see looks like, or what the header does when the playlist it names is playing.

The second problem is the list's own controls. Sort, filter, the skip setting, the sync band, the retry control and
the row's own menu are all things the web draws in a header column and a row lane. On a phone they compete for the
same width, and a control that is only reachable by scrolling back to the top is a control nobody uses.

## Solution

One column. The identity block draws the cover, the name, the share mark, the owner line, the count and the sync
line, with Play and Shuffle, and it scrolls away with the list. The sort and the status chips stick under the top
inset, so they are reachable at any scroll position. The track list is the queue's order, and it appends as it
scrolls. A row plays on a press anywhere and its lane opens a sheet. A playlist the account cannot see is a
not-found body with a way back; a failed read is a retry, never an empty list.

## User Stories

1. As an account, I want the playlist's cover and name at the top, so that I know where I am.
2. As an account, I want the platform back gesture to return me to the gallery, so that I never need a back button.
3. As an account, I want Play on the header, so that I can start the playlist from its top.
4. As an account, I want Shuffle on the header, so that I can start it in a random order.
5. As an account, I want the header to say when the playlist was last synced, so that I know how fresh it is.
6. As an account, I want the header to name the owner of a shared playlist, so that I know whose it is.
7. As an account, I want the count on the header, so that I know the playlist's size.
8. As an account, I want a failed playlist read explained and retryable, so that a network fault is not an empty playlist.
9. As an account, I want a playlist I cannot see to read as not found, so that the app never confirms one I may not have.
10. As an account, I want a playlist with no tracks to offer Sync now, so that I know what to do next.
11. As an account, I want a synced but empty playlist to say so, so that I do not mistake it for broken.
12. As an account, I want the sort and the chips to stay reachable while I scroll, so that I can narrow a long list.
13. As an account, I want to sort by playlist order, newest or oldest, so that I can read the list the way I want.
14. As an account, I want the sort saved, so that it is still there when I return.
15. As an account, I want a refused sort explained, so that I know the press did not stick.
16. As an account, I want status chips with counts, so that I can jump to the failed tracks.
17. As an account, I want a filtered-empty state with Show all, so that an empty filter is not a dead end.
18. As an account, I want the chips disabled while shuffled, so that I understand the list is not in its own order.
19. As an account, I want a track row to play on a press anywhere, so that the target is the row, not a glyph.
20. As an account, I want the playing row marked with a word and bars, so that I can find it while scrolling.
21. As an account, I want each row to carry its state word, so that a failed or pending track is legible without colour.
22. As an account, I want a failed row to explain itself and show the server's reason, so that I can decide whether to retry.
23. As an account, I want a row's lane to open a sheet, so that I can copy, retry, fetch whole or remove it.
24. As an account, I want to remove a track and undo it, so that one tap does not cost a track.
25. As an account, I want to retry every failed track at once, so that I do not fix them one by one.
26. As an account, I want a failed sync to show its band and its raw error, so that I can see what the source said.
27. As an account, I want to retry a failed sync from the band, so that the recovery is beside the problem.
28. As an account, I want to add a track from a floating action, so that the control is under my thumb.
29. As an account, I want to add one video to several playlists at once, so that I do not repeat the paste.
30. As an account, I want the per-playlist outcomes after adding, so that I know which ones took it.
31. As an account, I want the list to append as I scroll, so that a long playlist needs no button.
32. As an account, I want the list to land on the playing row, so that I find where the music is.
33. As an account, I want shuffle to reorder the list to the queue's order, so that the list and the queue agree.
34. As an account, I want a playlist I deleted to take me back to the gallery, so that I am not left on a dead screen.
35. As a read collaborator, I want no control I cannot use, so that the screen does not offer refusals.
36. As a screen-reader user, I want each row announced with its title, state and duration, so that the list is usable.
37. As a French-speaking account, I want the detail in French, so that the app stays in my language.

## Implementation Decisions

- **One column, and the identity block scrolls away.** The cover, name, share mark, owner line, count, sync line and
  the Play and Shuffle controls are the list's first item; the sort and the chips stick under the top inset. `Decided
here:` a sticky identity block spends a third of a phone screen on a cover the person has already read, and the
  controls are what a long scroll needs.
- **The transport lives in the player bar, not the header.** The header keeps Play and Shuffle, which start a queue;
  previous, play-pause and next are the bar's, and the bar is on every screen. `Decided here:` the web's header
  transport exists because its bar is an overlay at the bottom of a wide window; on a phone it would be the same
  three controls twice.
- **A playlist the account cannot see is a not-found body with a way back.** It is not a read failure and offers no
  retry, because a retry cannot change the answer. `Decided here:` the access model never confirms that an
  unreachable playlist exists, so the body says only that it is not there.
- **A failed read is the read-failure body with the problem's title and a retry.** It is never an empty list.
- **The empty states are the web's two, drawn as the app draws them.** A never-synced playlist offers Sync now; a
  synced playlist with no tracks says so. The loading state is a skeleton of rows under the header.
- **The sort is a sheet with three radios, and it is the playlist's saved value.** The refusal is a notice. The
  control is disabled for a read collaborator and while shuffled, as the web's rule says.
- **The status chips take the full width and wrap.** `Decided here:` the web's phone rule, kept because a scrolling
  chip rail hides the last state behind a gesture nobody knows about.
- **The filter is client state for the visit.** Leaving the screen clears it; the sort is the one saved value.
- **The row is one target.** A press anywhere plays, the lane opens a bottom sheet, and a row that cannot play has
  no play layer but keeps its lane. `Decided here:` the web's rule, and the sheet rather than a popover because a
  popover anchored to a row is a pointer affordance.
- **The sheet holds Copy link, Retry, Fetch whole and Remove, by the same access and state rules the web applies.**
  Copy link is universal; Retry is for a failed track; Fetch whole is for a failed track with the skip setting on;
  Remove is for the owner and a write collaborator. Copy link's behaviour is
  [`30-share-a-track`](30-share-a-track.md)'s.
- **Remove and delete are deferred with an undo snackbar.** Remove drops the row immediately and offers Undo for six
  seconds; Delete on the header's sheet does the same and pops to the gallery when it lands.
- **The failed-row disclosure and the sync band's raw error are inline disclosures.** The failure sentence is the
  shared formatter's; the server's reason is shown as-is behind a Show details control, never translated.
- **The sync band sits under the identity block and holds the counts, the stamp, the downloading line, Retry failed
  and the error band.** The band's content is [`01-sync-a-playlist`](01-sync-a-playlist.md)'s and
  [`02-store-a-track`](02-store-a-track.md)'s; this spec decides where it sits.
- **The skip-non-music switch sits in a settings row inside the identity block**, disabled for a read collaborator,
  with its refusal as a notice. The setting is [`10-skip-non-music-parts`](10-skip-non-music-parts.md)'s.
- **The list appends as it scrolls, with no Load more control.** `Decided here:` the web's control exists because a
  browser has no reliable bottom-of-list event; a native list has one, and a button for it would be a second way to
  do what the scroll already does.
- **The list lands on the playing row when the playlist is the queue**, scrolling it into view once, after the page
  holding it has loaded.
- **Shuffle reorders the list to the queue's order**, and turning it off restores the saved sort's order. The
  reorder is the web's, and the list is the queue.
- **Adding a track is the floating action on this screen.** It opens a sheet with the video URL and a checklist of
  write-accessible playlists, then reports one outcome per chosen playlist in the order chosen. The batch route and
  its three outcomes are [`04-curate-a-playlist`](04-curate-a-playlist.md)'s.
- **Inherited decisions are referenced, not restated:** the three reads and their keys, the access rule, the row's
  state words and tones, the cover chain, the sort's saved value and the filter's counts.

## Testing Decisions

- A test earns its place only if it fails when behaviour a user relies on changes. The tests assert which body is
  drawn for each read outcome, which controls an access level produces, which sheet items a row's state produces,
  that a press on a row starts the queue at that track, and that the filter's empty state offers Show all. They do
  not assert the header's height, the skeleton's shape, or the scroll position's exact offset.
- **The detail is tested at the screen's seam** with the three reads mocked: the not-found body, the read-failure
  body with retry, both empty states, the sort sheet and its refusal, the chips and the filter-empty state, the skip
  switch's disabled state, the sync band, and the row sheet's items per state. Prior art is the web detail's page
  tests.
- **The list's paging and landing are tested at the list's seam**: appending the next page at the end, and the
  playing row scrolled into view once. Prior art is the web's `LoadMoreControl` tests.
- **The critical journeys are Maestro flows**: open a playlist from the gallery, play a row and see the bar, filter
  to failed and back to all, and remove a track then undo. The sort's persistence and the chips' counts are widget
  tests, because their value is arithmetic.
- **Cut tests:** no test of the sticky row's elevation, the disclosure's animation, the snackbar's timing, or the
  exact copy of the not-found sentence.

## Out of Scope

- Reordering a track within a playlist, and any drag.
- A queue screen, which spec `23` owns, and a second list arrangement.
- Search, a global track list, and a per-track playlist list.
- Offline caching of a playlist, and a stored filter.
- A landscape or tablet arrangement.
- Editing a track's title, artwork or tags, which belong to the source.

## Further Notes

- The detail is the one screen where the app draws a header and a player bar at once. The bar is an overlay, so the
  list's last row pays its height as bottom padding, as the web's two pages do.
- The sticky sort and chips are the only controls the app keeps on screen while scrolling; everything else scrolls
  with the content.
