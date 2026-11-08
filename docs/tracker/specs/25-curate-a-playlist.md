# Curate a playlist on mobile

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A phone is where a person hears a track and decides to keep it. The web client can add a pasted video to several
playlists, remove a track with an undo, rename, delete, retry a failed download and flip the skip-non-music setting,
and the app has none of it. The verbs are not in doubt; what a phone changes is where they live. A row lane is a
pointer affordance, a centred dialog is a browser shape, a text field fights the keyboard, and a destructive item in
a sheet is a thumb away from the item above it.

The second problem is the batch add's answer. The server reports one outcome per chosen playlist, and a phone sheet
has to show a mixed result without turning into a table.

## Solution

The playlist's actions live in one sheet, reached from the detail's header and from the gallery card. Adding a track
is the floating action on the detail, opening a sheet with the video link and a checklist of the playlists the
account can write to, which reports one outcome per playlist in the order chosen. Removing a track drops the row and
offers an undo. Rename and delete ask once; delete returns to the gallery. The skip setting is a switch in the
detail's settings row, and Retry and Fetch whole sit in the row's sheet.

## Implementation Decisions

- **One actions sheet owns a playlist's mutations, reached from the detail's header and the gallery card.** It holds
  Share, Rename, Cover, Sync now, Pin or Unpin and Delete, filtered by the account's access. `Decided here:` the
  sheet is the one place a destructive item can be separated from the item above it, and the web's rule that the
  actions menu is the single owner is kept.
- **Rename is a modal sheet with one prefilled text field.** The name is trimmed, an empty result keeps Save
  disabled, and the schema's length bounds apply. A refusal keeps the sheet open with one sentence.
- **Delete is deferred and offers an undo for six seconds.** The row leaves the gallery and the detail immediately,
  and a delete from the detail pops to the gallery when the request lands. `Decided here:` the web's deferral, kept
  because the item sits in the same sheet as Share.
- **Adding a track is the detail's floating action.** The sheet holds the video link field and a checklist of the
  playlists the gallery read returns with owner or write access, with the current playlist preselected. The submit
  is one batch request, and the result is drawn in the sheet as one row per chosen playlist, in the order chosen,
  with `added`, `already present` and `refused` as the three outcomes. `Decided here:` a list of outcomes is the
  only honest way to show a mixed batch, and the sheet is where the choices were made.
- **A refused outcome names no reason.** The copy says the playlist refused the track and nothing more, because the
  server's refusal deliberately does not distinguish a playlist the account cannot see from one it cannot write to.
- **The checklist is capped at the first page of the gallery and says so.** `Decided here:` a picker that silently
  hid playlists would be worse than one that says it is showing the first page; a second paging control inside a
  sheet is not designed.
- **The link field's schema refusal is shown before the request is sent**, and a typed link asks once before the
  sheet is discarded.
- **Remove is the row's sheet, and it drops the row immediately with an undo snackbar.** The suppression the server
  writes is [`04-curate-a-playlist`](04-curate-a-playlist.md)'s, and the undo is a re-add, not an unsuppress.
- **Retry and Fetch whole are row-sheet items for a failed track.** Fetch whole appears only while the skip setting
  is on, and both are the routes spec `04` and spec `10` own.
- **Retry failed is the sync band's control**, not a per-row repetition, and it retries the failed set the band
  names.
- **The skip-non-music switch is a settings row inside the detail's identity block.** It is disabled, not hidden, for
  a read collaborator, and its refusal is a notice. The setting's semantics and its non-retroactivity are
  [`10-skip-non-music-parts`](10-skip-non-music-parts.md)'s.
- **Every refusal is the problem's title, mapped by code.** The sheet shows it beside the control that caused it and
  stays open.
- **Inherited decisions are referenced, not restated:** the permission rule for all six actions, the batch route's
  shape and its three outcomes, the deferral and the suppression, and the skip setting's meaning.
- **Undo after a remove re-adds the track as a manual association.** It does not restore the remote origin, and a later sync treats the re-added track as any other manual one.

## Out of Scope

- Reordering a track within a playlist.
- Editing a track's title, artwork or tags.
- A bulk remove, a bulk rename and any multi-select.
- Adding a playlist, which spec `21` owns, and the cover, which spec `29` owns.
- Sharing, which spec `26` owns.
- An admin override on somebody else's playlist.
- Offline edits and a queued mutation that retries later.
