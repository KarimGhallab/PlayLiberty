# Curate a playlist

Status: resolved
Labels: `enhancement`

## Problem Statement

A playlist can be read and nothing can be changed. Every route that would change one answers `501`:
`PATCH /playlists/:id`, `DELETE /playlists/:id`, adding a track, removing one, and retrying a failed one. The
playlist detail screen is designed with an overflow menu and an add-a-video dialog, and every control in them
is dead.

The product also promises something the current routes cannot express. A listener pastes one video and wants
it in several of their playlists at once, because that is how the music they already listen to gets into the
library. The route that exists is nested under a single playlist, so the only way to honour the promise with
it is to send one request per chosen playlist, which is what the add-a-video dialog assumed. That
assumption is wrong about the capability and right about the reason, and this spec replaces the route rather
than the promise.

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

## Implementation Decisions

- **The batch add is one top-level route, and it replaces the nested one.** The route is `POST /tracks`, its
  input is a video URL and a list of playlist ids, and the stubbed `POST /playlists/:id/tracks` goes away. A
  path nested under a playlist cannot express a choice of playlists, because the path already names one, and a
  route nested under a video cannot either, because the client does not know the video id until the server has
  resolved the URL. The resource being created is a manual association, and the request names the one video and
  the several playlists. _Decided here:_ this contradicts the dialog's earlier assumption that it
  fires one request per chosen playlist because no multi-playlist route exists. The capability in
  the product document is the objective and the route is built to serve it. The route shape is the one
  decision here that wants a written record when the ticket is cut, because it changes the contract three consumers
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
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)), and no transcoding ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)).

## Out of Scope

- Reordering a track within a playlist. No contract offers it and no control is designed for it.
- Moving a track from one playlist to another, which is a removal and an add.
- Editing a track's title, artwork, or any other metadata. The source owns metadata.
- Replacing or re-fetching a stored file for a track that is already stored.
- Sharing, which [`05-share-a-playlist`](05-share-a-playlist.md) owns.
- The download a new track triggers, which [`02-store-a-track`](02-store-a-track.md) owns.
- Syncing, which [`01-sync-a-playlist`](01-sync-a-playlist.md) owns.
- Any admin override on a playlist. A role is not authority over somebody else's gallery.
