# See the library

Status: resolved
Labels: `enhancement`

## Problem Statement

The web client's first screen has no behavior. The route exists and renders the raw result of
`GET /playlists` as a plain list, and nothing decides what a person sees or can do there. The library is the
only entry point to content and the route a user lands on, so every one of the client's other jobs starts
here: the add-a-playlist dialog has nothing to open, an item has nowhere to go, and an empty gallery and a
playlist with no tracks are the same picture. The screen is drawn, but a drawing is not a
decision about what the screen does when the list is empty, when a sync is running, when a sync failed, or
when the playlist belongs to somebody else.

The second problem is the shared item. The library wanted a "shared by" line and nothing
could supply it, because the playlist carries an owner id, `GET /me` returns only the caller, and
`GET /accounts` was a stub. [`05-share-a-playlist`](05-share-a-playlist.md) builds the directory, so the line
is affordable now and this spec decides whether the library draws it.

## Solution

The library is one list of the playlists the account can see, its own and the ones shared with it, with no
sections and no second meaning for a shared item. Each item is the playlist header, showing the cover, the
name, the association count, the sync state and time, and a share indicator, and its cover and name link to
the playlist. An owner's own playlist carries no "shared by" line; a playlist shared with the account names
the owner through the account directory. Before the first sync the screen is an empty gallery whose action is
"Add a playlist", which opens the dialog and creates a Synced playlist, and the new item appears from the
server rather than from the client's optimism.

## Implementation Decisions

- **The list route already exists, and this spec adds no server route.** `GET /playlists` returns the page the
  library draws, with `access`, `hasShares`, `trackCount`, `syncStatus` and `lastSyncedAt` already on the
  playlist schema. The behaviour here is the client's, plus the one directory read that the shared-by line
  needs and [`05-share-a-playlist`](05-share-a-playlist.md) provides.
- **One list, no sections.** A shared playlist and an owned one are the same item in the same list, ordered by
  name as the route returns them: case and accents are one for the comparison, so `Été` sorts with `Ete`
  rather than after `Zebra`. A second section was rejected because a shared item
  reachable only from a section is a second meaning for the same thing, and because a second section splits an
  empty gallery into two empty shelves. The pinned section is the one exception, because it is the account's
  own placement rather than a second meaning for a shared item, and because it is withdrawn when nothing is
  pinned; see [`13-pin-a-playlist`](13-pin-a-playlist.md).
- **The item is the playlist header, drawn at the arrangement the width fixes, and this spec adds no
  second item component.** The cover and the name are the two links to `/playlists/:id`, the cover link is
  hidden from the accessible name so a reader announces one link per item, and the sync line and the share
  indicator are the header's own.
- **A shared item names its owner; an owned one does not.** The item's `access` is `owner` on the account's own
  playlists, so the line is omitted there, and for `read` and `write` the client resolves `ownerAccountId`
  through `GET /accounts` and draws the display name. _Decided here:_ the alternative, the indicator alone, was
  the state before the directory existed, and this spec chooses the line now that the directory exists. A
  directory page that does not contain the owner leaves the line showing the indicator alone rather than a
  placeholder name, because a placeholder is read as a decision.
- **The count is the playlist's stored track count and it is not a promise of playability.** A playlist of 300
  with 290 still pending reads 300 and plays ten. The count is the stored count, and the library's job is not to
  re-encode that fact.
- **The sync line is the header's, and the library inherits it.** A syncing item says so, a failed one says so
  in the failed tone, and the time comes from `lastSyncedAt`, formatted by the shared UI foundation so both
  this screen and the detail agree. A playlist that has never synced reads as never synced, not as a fault.
- **The empty gallery is a different component from the playlist's empty state, and the two actions are
  different.** No playlists is "Add a playlist", because there is nothing to sync; a playlist with no tracks is
  "Sync now", because the playlist exists and has never been synced. The library never draws the second.
- **Adding a playlist is a dialog that submits `POST /playlists`, and the client does not invent the item.**
  The dialog takes the single URL field `CreatePlaylistInputSchema` already defines. On success the client
  invalidates the list and the new item arrives from the server already in `syncing`, which is what the route
  writes; there is no optimistic row, because a row the server has not made would have no id to open and would
  have to be reconciled the moment the real one lands.
- **A successful create closes the dialog and leaves the person in the library.** The new item is the feedback,
  and it is already marked as syncing. This is the library's decision and not the dialog's, and the detail
  screen is one press away if the person wants to watch it. _Decided here:_ the alternative, navigating into
  the new playlist, takes a person away from the gallery they were building.
- **While a sync is in flight the list refreshes, and that loop is
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md)'s.** The library states what it shows and that
  it refreshes; it does not decide the cadence.
- **The list is read once per page and the page has no control.** The route pages with the API's default of 50,
  and the screen has no search, sort, filter or pagination control. A library of more than one page
  is a library this screen cannot show all of, which is recorded as a limit
  rather than solved by inventing the control the glossary has ruled out.
- **There is no signed-out state on web.** The edge authenticates the browser before the SPA is served, so an
  unauthenticated request never reaches the library. If the server answers `401` anyway, that is the client's
  re-authentication path rather than a library state, and it is
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md)'s.
- **The library is a read and writes nothing on arrival.** Opening it, focusing it, and refreshing it create no
  playlist, no run, and no share.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the private deployment ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)).

## Out of Scope

- Search, sort, filter and pagination controls. Search is a permanent non-goal and the page size is the API's.
- The playlist detail screen's own behavior, which [`03-read-a-playlist`](03-read-a-playlist.md) and
  [`07-play-stored-audio`](07-play-stored-audio.md) own.
- The share dialog, which is [`05-share-a-playlist`](05-share-a-playlist.md)'s controls.
- The overflow actions on an item, which are [`04-curate-a-playlist`](04-curate-a-playlist.md) and
  [`01-sync-a-playlist`](01-sync-a-playlist.md).
- The data lifecycle of the screen, which
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns.
- A global library view and a per-track listing.
