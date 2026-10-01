# Curate a playlist

Status: agreed
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A playlist can be read and nothing can be changed. Every route that would change one answers `501`:
`PATCH /playlists/:id`, `DELETE /playlists/:id`, adding a track, removing one, and retrying a failed one. The
playlist detail screen is designed with an overflow menu and an add-a-video dialog, and every control in them
is dead.

The product also promises something the current routes cannot express. A listener pastes one video and wants
it in several of their playlists at once, because that is how the music they already listen to gets into the
library. The route that exists is nested under a single playlist, so the only way to honour the promise with
it is to send one request per chosen playlist, which is the shape the add-a-video dialog's design record
currently specifies. That record is wrong about the capability and right about the reason, and this spec
replaces the route rather than the promise.

The third problem is the one that decides the rest. A playlist is owner-owned and can be shared, so every one
of these routes has two callers with different rights, and the difference is invisible in the route itself.
Rename and delete belong to the owner alone. A write collaborator may add a track, remove a track and sync. A
read collaborator may do none of them. The rule is short, and it has to hold on the server as well as in the
interface, because a hidden control is not an authorisation check.

## Solution

One request adds one pasted video to any number of playlists the account can write to, and answers with one
outcome per chosen playlist so that a partly successful batch is legible rather than a single status code.
Renaming, deleting, removing a track and retrying a failed track are four more routes, all of which already
exist as stubs except the batch add. Every route enforces the same rule: the owner may do all of it, a write
collaborator may add, remove and retry, and a read collaborator may do none of it. Removing a track always
suppresses it, so the next sync does not put it back.

## User Stories

1. As a listener, I want to paste a video URL and choose several of my playlists, so that one song reaches
   every list it belongs in.
2. As a listener, I want the add dialog to show the playlist I am looking at already chosen, so that the
   common case is one press.
3. As a listener, I want to add a video to every playlist I can write to in one action, so that I do not
   repeat myself.
4. As a listener, I want to be told which playlists took the video and which did not, so that a partly
   successful add is not a mystery.
5. As a listener, I want a playlist that already has the video to count as done rather than as a failure, so
   that the action succeeds when the outcome is what I wanted.
6. As a listener, I want a video added to several playlists to be fetched once, so that my instance does not
   download the same song twice.
7. As a listener, I want the video to appear at the end of each playlist, so that adding does not rearrange
   what I already had.
8. As a listener, I want a playlist I cannot write to not be offered in the dialog, so that I am not shown a
   choice I cannot make.
9. As a listener, I want a playlist URL pasted where a video belongs to be refused clearly, so that I know
   which dialog I am in.
10. As a listener, I want to rename a playlist, so that the name is mine and not the source's.
11. As a listener, I want an empty name refused, so that a playlist cannot disappear from my library.
12. As a listener, I want to delete a playlist, so that a shelf I no longer want is gone.
13. As a listener, I want a deleted playlist to leave my other playlists alone, so that deleting one thing
    does not cost me another.
14. As a listener, I want the audio of a deleted playlist to be reclaimed eventually rather than immediately,
    so that deleting a playlist is fast and the disk catches up on its own.
15. As a listener, I want to remove a track from a playlist, so that the list reflects my choice.
16. As a listener, I want a removed track to stay removed after a sync, so that the source does not undo me.
17. As a listener, I want a track I removed to come back if I put it back on the source, so that removing it
    was a choice and not a deletion.
18. As a listener, I want removing a track to leave it playable in another playlist that has it, so that my
    arrangements are independent.
19. As a listener, I want to retry a track whose download failed, so that I do not have to run a whole sync to
    try one song again.
20. As a listener, I want a track that is gone from the source not to be retryable, so that retrying is not a
    way to keep asking for something that cannot come back.
21. As a playlist owner, I want to rename and delete my own playlist, so that it is mine to manage.
22. As a playlist owner, I want a write collaborator to add and remove tracks, so that the people I share with
    can help me curate.
23. As a playlist owner, I want a write collaborator unable to rename or delete, so that the playlist keeps an
    owner.
24. As a write collaborator, I want the controls I may use to be the only ones shown, so that the interface
    does not offer me a refusal.
25. As a read collaborator, I want to see the playlist and do nothing to it, so that a read share is a read
    share.
26. As a member of a household, I want a track I share with a playlist to be playable by everyone who has it,
    so that sharing works.
27. As an account, I want these actions to require the client header and pass the origin check, so that another
    site cannot change my library.
28. As an account, I want a playlist I cannot see to be refused the same way as one that does not exist, so
    that nothing is confirmed about other people's shelves.

## Implementation Decisions

- **The batch add is one top-level route, and it replaces the nested one.** The route is `POST /tracks`, its
  input is a video URL and a list of playlist ids, and the stubbed `POST /playlists/:id/tracks` goes away. A
  path nested under a playlist cannot express a choice of playlists, because the path already names one, and a
  route nested under a video cannot either, because the client does not know the video id until the server has
  resolved the URL. The resource being created is a manual association, and the request names the one video and
  the several playlists. _Decided here:_ this contradicts the add-a-video dialog's design record, which says
  the dialog fires one request per chosen playlist because no multi-playlist route exists. The capability in
  the product document is the objective and the route is built to serve it. The route shape is the one
  decision here that wants an ADR when the ticket is cut, because it changes the contract three consumers
  read.
- **The input is a URL and a non-empty list of playlist ids, and the URL must be a single video.** A playlist
  URL is refused for the whole request with `422`, because "add a video" takes a video, and the same field in
  a different dialog creates a playlist. The list accepts at most one hundred ids, which is above a default
  page of playlists so an account never reaches it in ordinary use, and it bounds the work one request can ask
  for.
- **The result reports one outcome per chosen playlist, in the order the ids were sent**, so a client can
  report against the list the user chose from. The outcomes are `added`, `already_present` and `refused`. There
  is no fourth value, and in particular there is no overall status that hides the mix: a single code cannot
  say "four added, one already had it, one refused", and a user who cannot tell which four cannot trust any of
  them.
- **`already_present` is a success, not a failure.** It is the outcome the association service already returns
  when the association exists, and the desired end state is the one the user asked for.
- **`refused` carries no reason.** A playlist the account cannot see and a playlist it cannot write to must be
  indistinguishable, or the batch becomes a way to discover which playlist ids exist on the instance. This is
  the same reason the other routes answer `404` rather than `403`, and it is the reason the dialog's wording
  has to be about the outcome rather than about the cause.
- **A refusal is evaluated per playlist, so a mixed batch is normal.** The owner or a write collaborator may
  add to a chosen playlist; a read collaborator and a non-collaborator may not. A playlist that was deleted, or
  whose share was revoked, between the dialog being drawn and the request landing is refused the same way.
- **The video is resolved once and one track results.** A video id the instance has never seen becomes one
  track with `fileStatus: pending`; a video id it already holds is reused untouched, whatever state it is in. A
  track is never duplicated because two playlists asked for it, and never downloaded twice.
- **The track is associated with each chosen playlist as a manual association, appended at the end.** A manual
  association is the vocabulary's term for exactly this, and appending is what a user means by adding something
  to a list. The association service already moves the playlist's track count in the same transaction as the
  row it counts, and this route goes through it rather than writing associations itself.
- **Rename is owner-only, and the name is trimmed before it is checked.** A name that is empty after trimming
  is refused, and the existing input schema's bounds of one to two hundred characters apply. A rename touches
  the name and nothing else: it does not touch the source, the cover, the last-synced time, or the sync status.
- **Delete is owner-only and is immediate for the playlist and deferred for the media.** The playlist and its
  associations go now; the stored files and thumbnails go when the weekly prune finds tracks with no
  associations, which [`06-prune-orphans`](06-prune-orphans.md) owns. Deleting a playlist therefore never
  waits on a disk operation, and a collaborator who had it sees it answer `404` from that moment, which is the
  not-found state the detail screen already has.
- **Deleting a playlist removes its associations through the database's cascade.** This is the one place the
  association service's rule, that associations are only ever created or removed through it, is bypassed, and
  it is safe for a specific reason worth stating: the only stored count that would need adjusting is the
  deleted playlist's own, and that row no longer exists.
- **Removing a track is owner or write collaborator, and it always suppresses.** The association is removed and
  a suppression for that playlist and video id is written in the same transaction, so a sync cannot re-add what
  was just removed. There is no opt-out, and that is deliberate: the alternative is a track the user removed
  reappearing on the next sync, which is the mirror image of the promise that a removed video never removes a
  track.
- **Removing a track from one playlist leaves it alone everywhere else.** The file stays, the track row stays
  while any association remains, and a playlist that still holds it keeps playing it.
- **Removing an association that is not there answers `404`,** the same as removing from a playlist the account
  cannot see, so the route does not confirm that the track is in a playlist the caller cannot reach.
- **Retry is owner or write collaborator of any playlist holding the track, and applies to `failed` only.** It
  returns the track to `pending` and the worker of [`02-store-a-track`](02-store-a-track.md) takes it from
  there. It does not start a sync, and it is refused for a track that is `unavailable`, because that state is
  terminal and retrying it would be a way to keep asking for a video that cannot come back. The right to retry
  follows the track rather than the playlist because the track is instance-wide: a household shares one copy of
  a song, and the person who can act on it is anyone who can reach it through a playlist they can write to.
- **Every mutating route here requires the client header and passes the origin check**, and none of them
  mutates on a read.
- **The permission rule, once, for all five routes:** the owner may rename, delete, add, remove and retry; a
  write collaborator may add, remove and retry; a read collaborator may do none of them. Managing shares is a
  sixth action and stays with the owner, which [`05-share-a-playlist`](05-share-a-playlist.md) owns. The server
  decides, and the interface's absence of a control is a convenience that follows from it rather than the thing
  that enforces it.
- **The web client renders the result of the rule, not the rule.** The detail screen draws the overflow items
  and the row controls the `access` field permits, and every refusal it never draws is still enforced when it
  is asked for directly.
- **Binding constraints, not negotiable inside this spec:** identity comes from the forwarded edge headers and
  fails closed; a playlist the account cannot see is `404` and never `403`; only the server writes the
  database; the stored media is the source of truth for playback, so removing an association never touches a
  file; and a playlist is owned by exactly one account.

## Testing Decisions

- **One seam, at the highest point available.** The real app over a temporary database and media root,
  exercised through HTTP injection, with accounts, playlists, shares and tracks seeded directly and a fake
  YouTube adapter so nothing in this spec touches the network.
- **What makes a good test here** is the response validated against the contract schemas plus the state a user
  would see afterwards, never the number of queries or the order the work happened in. A test that asserts
  three inserts ran is a test of the implementation; one that asserts three associations exist and the count is
  three is a test of the behaviour.
- **The cases that must exist:**
  - one request with three writable playlists adds one track and three manual associations, each at the end,
    and the track count moves by one on each;
  - the result carries one outcome per chosen playlist, in the order sent;
  - a playlist that already holds the video reports `already_present` and the batch otherwise succeeds;
  - a read collaborator's playlist is `refused` while the others are `added`, in the same request;
  - a playlist that does not exist is `refused` with the same shape as a refused writable one, so the two
    cannot be told apart;
  - a playlist URL is refused for the whole request with `422`, and no association is created anywhere;
  - an empty list, a malformed URL, and more ids than the cap are each refused with `422`;
  - a video id already in the instance produces one track and no second download, including when the existing
    track is `stored`;
  - the video is appended, and an existing position is unchanged;
  - rename trims, refuses an empty name, refuses a non-owner, and changes nothing but the name;
  - delete refuses a non-owner, removes the playlist and its associations, leaves other playlists' tracks and
    counts alone, and leaves the media on disk for the prune;
  - removing a track requires owner or write, removes the association, moves the count, writes a suppression,
    and leaves the file and any other playlist's association alone;
  - a sync after a removal does not re-add the association, and one after the video returns to the source does;
  - removing an association that is not there answers `404`;
  - retry moves a `failed` track to `pending`, is refused for `unavailable`, is refused for a read
    collaborator, and does not create a sync run;
  - every mutating route is refused without the client header.
- **Prior art:** the existing server route tests, which build the real app over a temporary database and media
  root, seed accounts directly and validate responses against the contract schemas, and the association
  service's own tests, which already cover the count moving in the same transaction as the row. The batch
  result is new, and the single-playlist association case it replaces is the prior art for the half of it that
  already exists.

## Out of Scope

- Reordering a track within a playlist. No contract offers it and no control is designed for it.
- Moving a track from one playlist to another, which is a removal and an add.
- Editing a track's title, artwork, or any other metadata. The source owns metadata.
- Replacing or re-fetching a stored file for a track that is already stored.
- Sharing, which [`05-share-a-playlist`](05-share-a-playlist.md) owns.
- The download a new track triggers, which [`02-store-a-track`](02-store-a-track.md) owns.
- Syncing, which [`01-sync-a-playlist`](01-sync-a-playlist.md) owns.
- Any admin override on a playlist. A role is not authority over somebody else's shelf.

## Further Notes

- The route shape here is the one place where this set of specs changes a decision another document already
  records. The product document promises the capability, and the add-a-video dialog record explains it away by
  saying no multi-playlist route exists. That record should be corrected when the ticket lands, and the route
  itself is worth an ADR because it is a contract change with three consumers.
- The result shape, one outcome per playlist, is the part most likely to be got wrong under time pressure,
  because the obvious implementation is a single status code and a loop of requests. It is the reason the
  verification list names the mixed batch explicitly.
- The suppression write is the smallest line in this spec and the one that most protects the product's promise
  in the other direction. A removal that does not write one is a track that comes back on the next sync, and
  the user experiences that as the product breaking its word.
