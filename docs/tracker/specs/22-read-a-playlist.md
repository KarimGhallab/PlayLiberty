# Read a playlist on mobile

Status: resolved
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
line, with Play and Shuffle, and it scrolls away with the list. The sort and the status chips follow it as one
horizontal rail, so the cover leads and the controls stay together. The track list is the queue's order, and it
appends as it scrolls. A row plays on a press anywhere and its lane opens a sheet. A playlist the account cannot see
is a not-found body with a way back; a failed read is a retry, never an empty list.

## Implementation Decisions

- **One column, and the identity block leads.** The cover, name, share mark, owner line, count, sync line and the
  Play and Shuffle controls are the list's first item; the sort and the chips follow it as one horizontally scrolling
  rail. `Decided here:` the header stays first and the controls stay together; a band fixed over the list cost more
  of the screen than the reach it returned.
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
- **The status chips share one horizontal rail with the sort.** `Decided here:` the gallery's rail keeps the six
  states on one line; the rail scrolls sideways rather than wrapping onto rows.
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
- **The player bar is an overlay, so the list's last row pays its height as bottom padding.** See [DESIGN.md](../../DESIGN.md#the-settled-arrangements).

## Out of Scope

- Reordering a track within a playlist, and any drag.
- A queue screen, which spec `23` owns, and a second list arrangement.
- Search, a global track list, and a per-track playlist list.
- Offline caching of a playlist, and a stored filter.
- A landscape or tablet arrangement.
- Editing a track's title, artwork or tags, which belong to the source.
