# See the library

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

The web client's first screen has no behavior. The route exists and renders the raw result of
`GET /playlists` as a plain list, and nothing decides what a person sees or can do there. The library is the
only entry point to content and the route a user lands on, so every one of the client's other jobs starts
here: the add-a-playlist dialog has nothing to open, an item has nowhere to go, and an empty gallery and a
playlist with no tracks are the same picture. The design record draws the screen, but a drawing is not a
decision about what the screen does when the list is empty, when a sync is running, when a sync failed, or
when the playlist belongs to somebody else.

The second problem is the shared item. The design record wanted a "shared by" line and recorded that nothing
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

## User Stories

1. As a listener, I want to land on a list of my playlists, so that I can choose what to listen to.
2. As a listener, I want a playlist I own beside one shared with me, in one list, so that I do not have to
   look in two places.
3. As a listener, I want each item to show its name, cover and track count, so that I recognise it.
4. As a listener, I want each item to show whether it is up to date, syncing or failed, so that a fault is
   visible without opening it.
5. As a listener, I want a shared item to say who shared it, so that a gallery of several people's playlists is
   legible.
6. As a listener, I want to open a playlist from its cover or its name, so that a list is a set of doors.
7. As a listener, I want to add a playlist by pasting a URL, so that this is where content enters the instance.
8. As a listener, I want the new playlist to appear as soon as it is created and to show that it is syncing, so
   that I am not left wondering whether the paste worked.
9. As a listener with no playlists at all, I want to be told so and offered the one action that helps, so that
   an empty screen is an invitation rather than a gap.
10. As a listener, I want a playlist that exists but has never synced to be a different state from having no
    playlists, so that "nothing yet" and "something is wrong" do not look the same.
11. As a listener, I want the count to be the number of tracks the playlist holds, so that I can compare a
    playlist to YouTube without opening it.
12. As a listener, I want a long list to still open, so that a large library is not a screen that never loads.
13. As a read collaborator, I want the playlist I was given to appear here, so that a share is usable rather
    than a message.
14. As a member of a household, I want a playlist shared with me to be marked as not mine, so that I do not
    expect to rename or delete it.
15. As an account, I want a playlist I have lost access to to disappear, so that a revoked share is not a
    broken row.
16. As an account, I want the library to show only what I can see, so that a gallery is not a place to discover
    other people's ids.
17. As a listener, I want the list to refresh while a sync runs, so that the counts and the state are current.
18. As a listener, I want a failed sync on the library to read the same way as on the playlist, so that I do
    not learn a second vocabulary for one fact.
19. As an operator, I want the library to be a read, so that landing on it never changes anything.

## Implementation Decisions

- **The list route already exists, and this spec adds no server route.** `GET /playlists` returns the page the
  library draws, with `access`, `hasShares`, `trackCount`, `syncStatus` and `lastSyncedAt` already on the
  playlist schema. The behaviour here is the client's, plus the one directory read that the shared-by line
  needs and [`05-share-a-playlist`](05-share-a-playlist.md) provides.
- **One list, no sections.** A shared playlist and an owned one are the same item in the same list, ordered by
  name as the route returns them: case and accents are one for the comparison, so `Été` sorts with `Ete`
  rather than after `Zebra`. The design record rejected a second section because a shared item
  reachable only from a section is a second meaning for the same thing, and because a second section splits an
  empty gallery into two empty shelves. The pinned section is the one exception, because it is the account's
  own placement rather than a second meaning for a shared item, and because it is withdrawn when nothing is
  pinned; see [`13-pin-a-playlist`](13-pin-a-playlist.md).
- **The item is the playlist header, drawn at the arrangement the design record fixes, and this spec adds no
  second item component.** The cover and the name are the two links to `/playlists/:id`, the cover link is
  hidden from the accessible name so a reader announces one link per item, and the sync line and the share
  indicator are the header's own.
- **A shared item names its owner; an owned one does not.** The item's `access` is `owner` on the account's own
  playlists, so the line is omitted there, and for `read` and `write` the client resolves `ownerAccountId`
  through `GET /accounts` and draws the display name. _Decided here:_ the alternative, the indicator alone, is
  the state the design record was written in, and this spec chooses the line now that the directory exists. A
  directory page that does not contain the owner leaves the line showing the indicator alone rather than a
  placeholder name, because a placeholder is read as a decision.
- **The count is the playlist's stored track count and it is not a promise of playability.** A playlist of 300
  with 290 still pending reads 300 and plays ten. The design record says so, and the library's job is not to
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
  and the design record rejects search, sort, filter and pagination controls. A library of more than one page
  is a library this screen cannot show all of, which is recorded as a limit here and in the design record
  rather than solved by inventing the control the glossary has ruled out.
- **There is no signed-out state on web.** The edge authenticates the browser before the SPA is served, so an
  unauthenticated request never reaches the library. If the server answers `401` anyway, that is the client's
  re-authentication path rather than a library state, and it is
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md)'s.
- **The library is a read and writes nothing on arrival.** Opening it, focusing it, and refreshing it create no
  playlist, no run, and no share.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the private deployment ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)).

## Testing Decisions

- **The seam is the component plus the two reads it makes.** The library is exercised with a mocked network:
  `GET /playlists` for the list and `GET /accounts` for the one owner name a shared item needs. The dialog is
  exercised by submitting it and asserting the request the client made and the state it moved to, never the
  internals of the form.
- **What makes a good test here** is what a person sees and what the client asks for, never the order of
  renders. A test that asserts a fetch fired is a test of the plumbing; one that says an empty account shows
  "Add a playlist" and a shared item shows its owner's name is a test of the feature.
- **The cases that must exist:**
  - a populated library renders one item per playlist with its name, count and sync line;
  - an account with no playlists renders the empty gallery and its action, and not the playlist empty state;
  - a playlist in `syncing` renders as syncing, and one in `error` renders the failed state;
  - a playlist that has never synced renders as never synced rather than as a fault;
  - a shared item renders the owner's display name, and an owned item renders no line;
  - a shared item's owner is missing from the directory page and the item falls back to the indicator alone;
  - the cover and the name both navigate to `/playlists/:id`, and the cover link is not separately announced;
  - submitting the dialog with a valid URL posts it, closes, and invalidates the list;
  - submitting an invalid or empty URL is refused by the schema and no request is made;
  - the page has no search, sort, filter or pagination control;
  - a revoked playlist disappears on the next list read and nothing else changes.
- **Prior art:** the library component's own test already renders through the query provider against a mocked
  list, and the design record's fixtures are the shapes the cases above assert against. The shared-access
  helpers behind `GET /playlists` already cover what a caller can see, so this spec tests the screen and not
  the visibility rule.

## Out of Scope

- Search, sort, filter and pagination controls. Search is a permanent non-goal and the page size is the API's.
- The playlist detail screen's own behavior, which [`03-read-a-playlist`](03-read-a-playlist.md) and
  [`07-play-stored-audio`](07-play-stored-audio.md) own, and its design record draws.
- The share dialog, which is [`05-share-a-playlist`](05-share-a-playlist.md)'s controls and its design record.
- The overflow actions on an item, which are [`04-curate-a-playlist`](04-curate-a-playlist.md) and
  [`01-sync-a-playlist`](01-sync-a-playlist.md).
- The data lifecycle of the screen, which
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns.
- A global library view and a per-track listing.
