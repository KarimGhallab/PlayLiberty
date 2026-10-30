# See the library on mobile

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The library is the app's first screen and the only entry point to content, and on a phone the web client's
arrangement is not available: its tile is a wide grid item, its header carries a labelled Add and a language menu,
and its filter rail is a measured, scrolling strip. The mobile client has a thumb, a 390-wide frame, a floating
action and an account sheet, and none of the decisions that make those work exist yet.

The second problem is what a card can hold. The web's item carries a cover, a name, a share indicator, an owner
line, a count, a sync state and time, an incomplete badge with a breakdown, and three controls. At 170 points of
width, drawing all of it produces a card nobody can read, and dropping the wrong parts loses the information that
makes a gallery usable.

## Solution

The gallery is a two-column grid of playlist cards. Each card draws its cover, its name, the owner line for a
playlist shared with the account, the count, the sync line, the share indicator and the incomplete mark, with the
play control and an overflow control on its scrim. The whole card opens the playlist. Pinned playlists come first
under their own heading, a playlist whose first sync is running follows under a Syncing heading, and the rest
follows with no heading. The header holds the app's name, the bulk sync and the account button; the add control is
the floating round action, or the empty gallery's own labelled button. The ownership scope and the status chips are
one scrolling row above the grid.

## User Stories

1. As an account, I want my playlists as a grid of covers, so that I can find one by sight.
2. As an account, I want the whole card to open the playlist, so that I do not have to aim at its name.
3. As an account, I want to play a playlist from its card, so that one press starts the music.
4. As an account, I want a pinned playlist above the rest, so that the one I use most is where I expect it.
5. As an account, I want the pinned section to disappear when nothing is pinned, so that an empty heading is never drawn.
6. As an account, I want a playlist whose first sync is running under its own heading, so that I understand why it has no name yet.
7. As an account, I want a shared playlist to name its owner, so that I know whose it is.
8. As an account, I want a shared playlist marked, so that I can tell it from my own at a glance.
9. As an account, I want the count and the sync line on the card, so that I know what is in it and when it last ran.
10. As an account, I want an incomplete playlist marked, so that I know some tracks are not ready.
11. As an account, I want the breakdown of those states on the detail, so that the card stays readable.
12. As an account, I want a menu on the card, so that I can pin, share, rename, cover, sync or delete it.
13. As an account, I want to add a playlist from a floating action, so that the control is under my thumb.
14. As an account with no playlists, I want a labelled action in the middle, so that I know where to start.
15. As an account, I want to paste a YouTube playlist link, so that a sync starts from it.
16. As an account, I want the new playlist to appear marked as syncing, so that I can see it was accepted.
17. As an account, I want to choose whether non-music parts are skipped, so that a long upload does not keep its spoken breaks.
18. As an account, I want a busy state on Add, so that I do not create two playlists with two presses.
19. As an account, I want an invalid link refused before it is sent, so that I am not waiting on a request that cannot work.
20. As an account, I want to be asked before a typed link is discarded, so that I do not lose it to a stray tap.
21. As an account, I want the gallery scoped to All or Shared with me, so that I can find what was shared with me.
22. As an account, I want a count on each scope, so that I know how much is there before I switch.
23. As an account, I want the scopes hidden when nothing is shared with me, so that I am not offered an empty view.
24. As an account, I want status chips with counts, so that I can see how many tracks are ready or failed.
25. As an account, I want the chips to scroll rather than clip, so that every state is reachable on a narrow screen.
26. As an account, I want to sync every playlist at once, so that a new phone catches up in one press.
27. As an account, I want the bulk sync to tell me its count, so that I know how much work I asked for.
28. As an account, I want the tally after a bulk sync, so that I know what changed and what failed.
29. As an account, I want a failed read explained and retryable, so that a network fault is not an empty gallery.
30. As an account, I want a skeleton while the gallery loads, so that the screen does not jump.
31. As an account, I want to pull the gallery down to refresh it, so that I can force an update when I doubt the screen.
32. As an account, I want a failed pin or a refused play explained, so that I know the press did nothing and why.
33. As an account, I want a deleted playlist to offer an undo, so that one tap does not cost a playlist.
34. As a screen-reader user, I want each card announced once with its name, so that the grid is navigable.
35. As a screen-reader user, I want the play control named for its playlist, so that I know which one I am starting.
36. As a French-speaking account, I want the gallery and its sheets in French, so that the app stays in my language.

## Implementation Decisions

- **The gallery is a two-column card grid.** The card is the existing header arrangement at 390: cover above the
  identity, the controls on a scrim over the cover. The web's wide tile is not drawn on mobile, and the card is not
  re-derived per screen. `Decided here:` the grid is the phone arrangement the design already draws, and two columns
  is what 390 holds without a card narrower than a thumb target.
- **The card holds the play control and the overflow control; everything else lives in the sheet.** The scrim
  carries play and the overflow; Shuffle, Pin or Unpin, Share, Rename, Cover, Sync now and Delete are sheet items.
  `Decided here:` three controls on a 170-point card is a row of targets a thumb cannot separate, and the sheet is
  already the one owner of a playlist's actions.
- **The owner line is drawn on the card, truncated to one line.** A playlist shared with the account names its owner
  through the account directory; an owned playlist draws nothing. `Decided here:` whose playlist it is decides
  whether a person may rename it, so the line survives the narrow card and the name truncates instead.
- **The incomplete mark carries its count and no breakdown.** The web's tooltip breakdown has no mobile analogue;
  the breakdown is the detail's status chips, which count the same states. `Decided here:` a press target that opens
  a tooltip would be a new verb invented to preserve a web affordance.
- **The header holds the app's name, the bulk sync and the account button.** The language control and the egress
  door are in the account sheet, which spec `19` owns, so the header carries no globe and no admin mark.
- **The bulk sync reads "Sync all {count}" and truncates to "Sync all" only when the header cannot hold it.** The
  count is what makes the press honest about its work, so it is dropped last, not first.
- **The add control is the floating round action, never the labelled button.** An empty gallery draws its own
  labelled action in the body instead, and the floating action is then absent. `Decided here:` the design record's
  rule for the two widths, applied to the app as its only arrangement.
- **Adding is a modal sheet over the gallery.** It holds the URL field, the skip-non-music checkbox, Add, Cancel, a
  busy state, the schema refusal and the discard confirmation. A successful create closes the sheet and leaves the
  person in the gallery, with the new item arriving from the server already syncing.
- **The ownership scope and the status chips are one horizontally scrolling row above the grid.** The scope is two
  segments with counts, the chips are the five file states plus All with counts, and the row is absent for the scope
  only when nothing is shared with the account. `Decided here:` a wrapping block would push the gallery two rows
  down, and the row is read left to right in one gesture.
- **The scopes and chips are client state for the visit.** No stored value and no route parameter, matching the
  web's filter rule; the sort is the web's one saved value and it lives on the playlist.
- **A read failure is a body with the problem's title and a retry**, distinct from the empty gallery. The loading
  state is a grid of skeleton cards, and the empty gallery is its own body with one labelled action.
- **Pull to refresh is the app's own verb.** It refetches the gallery and its counts. `Decided here:` the web has no
  such control because a browser has a reload button; a phone has none, and the stream can be down.
- **A refusal is a notice that does not interrupt.** A failed pin, a refused play or shuffle, and the bulk sync's
  tally use the app's notice surface, and a notice is never a modal.
- **Delete is deferred with an undo snackbar.** The row is removed from the gallery immediately, the delete is sent,
  and the snackbar offers Undo for six seconds. `Decided here:` the web's rule, kept because a card is a thumb away
  from a destructive item in the same sheet.
- **The grid draws one page and appends as it scrolls.** The list route's page size is unchanged, and the gallery
  loads the next page when the last row is near. `Decided here:` the web's library has no control and no paging, and
  the app cannot inherit that limit without hiding playlists.
- **Inherited decisions are referenced, not restated:** the one list with the pinned exception, the count's meaning,
  the sync line's meaning, the empty-versus-error distinction, and the create flow are
  [`08-see-the-library`](08-see-the-library.md)'s; the pin is [`13-pin-a-playlist`](13-pin-a-playlist.md)'s; the
  scope and the chips are [`12-sort-and-filter-the-track-list`](12-sort-and-filter-the-track-list.md)'s and issue
  `94`'s; the actions are [`04-curate-a-playlist`](04-curate-a-playlist.md)'s, [`05-share-a-playlist`](05-share-a-playlist.md)'s,
  [`14-upload-a-playlist-cover`](14-upload-a-playlist-cover.md)'s and [`01-sync-a-playlist`](01-sync-a-playlist.md)'s.

## Testing Decisions

- A test earns its place only if it fails when behaviour a user relies on changes. The tests assert which cards are
  drawn and in which group, which sheet items a card's access produces, that a press on a card opens the playlist,
  that the scope and chip counts come from one read, and that a failed read is not an empty gallery. They do not
  assert column widths, skeleton shimmer, or the snackbar's timing.
- **The gallery is tested at the screen's seam** with the reads mocked: the three groups and their headings, the
  owner line only for a shared item, the incomplete mark's count, the empty gallery's action, and the failure body
  with its retry. Prior art is the web library's page tests.
- **The add sheet is tested at its own seam**: the schema refusal, the busy state, the discard confirmation, and the
  skip checkbox's default. Prior art is the web's `AddPlaylistDialog` tests.
- **The actions sheet is tested where the shared actions model is tested**: the items each access level produces,
  the pin's label, and the delete's deferral. Prior art is the web's `playlistActions` tests.
- **The critical journeys are Maestro flows**: open the gallery and reach a playlist, add a playlist from the
  floating action, and pin one from its card. The scope and the bulk sync are covered by the widget tests, because
  their value is arithmetic rather than navigation.
- **Cut tests:** no test of the grid's column count, the scrim's gradient, the skeleton's animation, or the exact
  copy of the empty gallery.

## Out of Scope

- Search, and any sort or filter of the gallery itself. The chips filter tracks, not playlists.
- A light theme, a tablet arrangement, and a landscape grid.
- A second list arrangement, and the web's wide tile.
- Offline caching of the gallery, and a stored filter or scope.
- A notification when a sync finishes while the app is closed.
- The playlist detail, which spec `22` owns, and the player, which spec `23` owns.

## Further Notes

- The card is the same arrangement the detail's hero draws on the web, so a cover change reaches both surfaces
  through the one cover seam. Nothing here re-implements the fallback chain.
- The status chips count the whole gallery's tracks, not the visible page, so the counts are the same figures the
  web shows.
