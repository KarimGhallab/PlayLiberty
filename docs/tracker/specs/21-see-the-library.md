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
- **The card is the detail hero's arrangement,** so a cover change reaches both surfaces through the one cover seam; nothing re-implements the fallback chain.
- **The status chips count the whole gallery's tracks, not the visible page,** so the counts match the web's figures.

## Out of Scope

- Search, and any sort or filter of the gallery itself. The chips filter tracks, not playlists.
- A light theme, a tablet arrangement, and a landscape grid.
- A second list arrangement, and the web's wide tile.
- Offline caching of the gallery, and a stored filter or scope.
- A notification when a sync finishes while the app is closed.
- The playlist detail, which spec `22` owns, and the player, which spec `23` owns.
