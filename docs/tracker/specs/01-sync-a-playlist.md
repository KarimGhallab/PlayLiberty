# Sync a playlist

Status: resolved
Labels: `enhancement`

## Problem Statement

A listener pastes a YouTube playlist URL into the web client and nothing happens. `POST /playlists` and
`POST /playlists/:id/sync` both answer `501`, so no playlist is created, nothing is read from the source, and
no audio is queued. The web client has an add-a-playlist dialog and a sync control in the playlist header,
and both are dead. The listener's only way to hear the music they chose is YouTube itself, which is the thing
PlayLiberty exists to replace.

The second half of the problem matters more, and it arrives the moment a sync does. A source changes while
nobody is looking: videos are deleted, an owner tidies a playlist, a source becomes private. A sync that
misreads any of that as "these tracks are gone" empties the gallery, and the gallery is the only copy the
listener has. The first product principle is that a removed source video never removes an already stored
track, and nothing in the codebase enforces it, because no sync exists to enforce it.

## Solution

Pasting a playlist URL, or a single video URL, creates a Synced playlist mirroring that Source and starts a
sync run. A sync reads the source membership once through the YouTube adapter, reconciles it against what the
playlist already holds, and adds without ever subtracting: a video missing from the source keeps its file and
is marked remote-removed, a video the listener removed stays removed, and a new video becomes a track queued
for download. The run records what it added, retained and failed, the playlist records when it last synced,
and running the same sync twice changes nothing the second time.

A sync that cannot read its source changes nothing at all. That is the constraint the rest of this spec is
built to protect, and it is a refusal rather than a recovery.

## Implementation Decisions

- **The two mutating routes are the ones already stubbed**: create a synced playlist from a URL, and start a
  sync on an existing playlist. Both return `202` with the sync run they created, which is in `running`.
  `CreatePlaylistInputSchema` already carries a URL, so the input does not change.
- **Both routes are asynchronous, and neither adds a polling route.** The reconcile reads YouTube, so it
  cannot finish inside a request. A client learns the outcome from the latest-run route that already exists
  and is already served, which reports `sync_run_absent` separately from a failed run precisely so a client
  can tell the two apart. _Decided here:_ no route returns a run by id, so `202` plus the latest-run route is
  the whole contract. How the web client polls it, and when it stops, is
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md).
- **One run at a time per playlist.** A second request while a run is in flight answers `409` with a problem
  document. Two concurrent runs would each assign positions to the associations they create and each write
  the playlist's counts, and the loser would overwrite the winner's numbers. _Decided here:_ the alternative,
  queueing the second run, is not distinguishable from a stuck run to a user.
- **A single video URL is a valid Source.** It creates a Synced playlist whose source is that video, with one
  remote association. The glossary defines a Source as a playlist URL or a single video URL, so the route
  accepts both. This is not the manual association of [`04-curate-a-playlist`](04-curate-a-playlist.md), which
  adds a video to playlists that already exist. _Decided here:_ the distinction between the two, since the
  vocabulary has both and the contracts have both.
- **Re-pasting a source the caller already synced returns the existing playlist** and starts a run on it. It
  does not create a duplicate and it does not answer `409`.
- **Source uniqueness is per owner.** The unique index the schema ships is on provider and source playlist id
  alone, which would stop a second account from ever mirroring a source the first account mirrored. It
  becomes owner, provider, source playlist id. The media store is server-wide and the playlist is
  owner-owned, so two accounts holding one source cost two sets of associations and no extra media.
  _Decided here:_ this is a schema migration, and it is the one decision in this spec that
  changes a constraint the database already enforces.
- **Reconciliation is one pass over the source membership, with five cases and no others:**
- a video id the instance has never seen becomes a new track with `fileStatus: pending` and one remote
  association appended at the end of the playlist;
- a video id already associated with this playlist is left exactly as it is, including its position and its
  metadata;
- a video id associated with this playlist and absent from the source has its track marked
  `sourceStatus: removed`, which is remote-removed, and the file is retained;
- a video id with a suppression for this playlist is skipped, and gets no association;
- a video id the instance already holds as a track gets a new association only, never a second track and
  never a second download.
- **Positions are append-only under a sync.** A sync assigns a position only to an association it creates,
  and never rewrites the position of one that already exists. Reordering in YouTube therefore does not reorder
  the gallery, and a sync cannot fight an arrangement the user made. _Decided here:_ no contract offers
  reordering in v1, and the alternative makes a sync destructive in a second, quieter way.
- **`sourceStatus: removed` is a claim about the source, not about the file.** Because the flag lives on the
  track rather than on the association, marking it removed makes the row read as remote-removed in every
  playlist that holds that track, including a playlist it was added to by hand. Playback is unaffected, which
  is the promise: a stored file is served whatever the flag says, and the row's play control stays present
  whenever there is a file.
- **A track that left the source before it was ever downloaded becomes `unavailable`, not `pending`.** It has
  no file, it is not going to get one, and leaving it queued would be a promise nothing keeps. `unavailable`
  is terminal and is not played. A download that discovers the same thing takes the same pair of values, which
  [`02-store-a-track`](02-store-a-track.md) owns for its own path.
- **A run that cannot read its source mutates nothing.** No association is created, no track is marked
  removed, no position moves, the run is `failed` with a short error, and the playlist's `syncStatus` becomes
  `error`. An unreadable source and a source with nothing in it produce the same payload from the adapter, so
  reading a failure as an empty listing would apply retention to every track in the playlist at once. This is
  the most dangerous failure in the product and the answer is a refusal, not a recovery. _Decided here:_ the
  architecture names the reconcile and the counts but not the failure branch.
- **The four counts mean this, and the first and third are zero by construction:**
- `addedCount` is the number of associations the run created;
- `retainedCount` is the number of tracks the run marked remote-removed;
- `removedCount` is always `0` in v1, because a sync never removes an association, and the field exists so
  a client can show a number that will mean something if a future decision gives a sync the power to
  remove;
- `failedCount` is the number of tracks left in `failed` or `unavailable` for this playlist after the run.
  _Decided here:_ the architecture names four counts and does not say what each measures.
- **`lastSyncedAt` is set when a run finishes, whether it completed or failed**, because a failed run is a
  sync that happened. `syncStatus` is `syncing` while a run is in flight, `error` after a failure, and `idle`
  after a success. _Decided here:_ the alternative, leaving `lastSyncedAt` null on failure, makes a failed
  first sync indistinguishable from a playlist that has never synced, and the empty state is defined as
  `lastSyncedAt` being null.
- **The playlist takes its name and cover from the source**, both read in the same pass, because the name is
  non-nullable and nothing else in the contracts says where a name comes from. A source with no usable title
  falls back to its source id.
- **A field the flat pass does not carry is fetched as a single-video read; the rest of the playlist never
  is.** A missing duration on one entry costs one extra read, and a playlist never degrades to a read per
  entry.
- **The run's counts, the playlist's `lastSyncedAt` and its `syncStatus` are written in one transaction at the
  end of the run**, so a client never reads a finished run beside a playlist that still says it is syncing.

- **Suppression is written by removing a track and read only by the reconcile.** The table exists in the
  schema and nothing in the server references it; this spec gives the reader and
  [`04-curate-a-playlist`](04-curate-a-playlist.md) gives the writer.
- **Everything about YouTube stays behind the adapter.** The sync never parses yt-dlp output and never spawns
  a process, because the adapter is the only seam to the source and that boundary is what makes the sync
  testable at all.
- **Inherited constraints are owned by the architecture and not restated here:** identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), no transcoding and the AAC/M4A store ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)), private deployment behind the edge ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)), and the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)). The retention promise is owned by [`PRODUCT.md`](../../PRODUCT.md).

## Out of Scope

- Reordering a playlist, and any surface for it. A sync never moves a track that already exists.
- Moving a track between playlists, which is a removal and an add.
- Scheduled or automatic syncs. Syncing is manual in v1.
- Syncing on behalf of an account, and any admin override on a playlist.
- Any provider other than YouTube.
- Deleting a playlist, sharing one, and adding a video to an existing playlist. Those are
  [`04-curate-a-playlist`](04-curate-a-playlist.md) and [`05-share-a-playlist`](05-share-a-playlist.md).
- The download itself, which [`02-store-a-track`](02-store-a-track.md) owns.
- The read route the web client needs to render the result, which
  [`03-read-a-playlist`](03-read-a-playlist.md) owns.
- The client's live view of a run in flight, which
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns.
