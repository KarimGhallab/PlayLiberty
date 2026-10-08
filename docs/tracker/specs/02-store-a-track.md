# Store a track

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A track only becomes playable once its audio is on the server, and nothing fetches it. The download worker in
the server is an idle timer that logs the media root every thirty seconds, claims no rows, and owns no queue,
so a track created by a sync would sit in `pending` forever. The listener pastes a playlist, sees a list of
tracks in the web client, and hears nothing, with no way to tell whether the work is happening, finished, or
broken.

The second problem is the one that decides the shape. PlayLiberty is a durable copy, so a download that dies
halfway is worse than one that never started: a truncated file that looks playable, or a row claiming a file
that is not there, are both failures the user finds out about at the worst moment. And one video can be
referenced by several playlists and several accounts, so the same audio must be fetched once and only once,
or the instance quietly becomes a download client for YouTube.

## Solution

A single in-process worker takes pending tracks from the track rows themselves, claims each one atomically,
fetches its audio through the YouTube adapter into a temporary location, moves it into the media store in one
step, and records what happened. A track moves from `pending` to `downloading` to `stored`, or to `failed`
with a reason a user can read, and a failed track is retried by the next sync without being asked for. A video
that has been deleted is terminal and is not retried. A video the instance already holds is never fetched
again, whoever asks for it.

## User Stories

1. As a listener, I want the audio of a track I pasted to arrive on its own, so that I do not have to wait
   for a second action.
2. As a listener, I want to see a track as pending, then downloading, then playable, so that the wait is
   visible rather than mysterious.
3. As a listener, I want to start playing a track the moment it is stored, so that the list is a gallery and
   not a to-do list.
4. As a listener, I want a track that failed to download to say so, so that I know the difference between
   missing and broken.
5. As a listener, I want a failed download to be tried again by my next sync, so that a dropped connection
   does not cost me a song permanently.
6. As a listener, I want a track whose video has been deleted to stop being retried, so that the instance
   does not hammer a video that will never come back.
7. As a listener, I want a deleted video's track to be marked as gone rather than as broken, so that the two
   read differently.
8. As a listener, I want the audio I already have to be played exactly as it was fetched, so that it plays
   natively everywhere and sounds the way it did.
9. As a listener, I want to seek within a track without waiting for the whole file, so that a long track is
   usable.
10. As a listener, I want the artwork for a track to appear, so that the list is recognisable.
11. As a listener, I want a missing piece of artwork not to stop the audio from arriving, so that a cosmetic
    failure cannot cost me a song.
12. As a listener, I want a track in two of my playlists to be stored once, so that my instance stays small
    and YouTube sees one request.
13. As a member of a household, I want my partner's track and mine to be the same stored file, so that
    deduplication is a property of the instance and not of one account.
14. As a member of a household, I want a track another member already fetched to be immediately playable for
    me, so that sharing a playlist shares the music.
15. As an account, I want downloads to run a few at a time rather than all at once, so that the instance
    stays responsive and YouTube is not hammered.
16. As a listener, I want a crashed download to be cleaned up when the server starts again, so that a
    half-written file is never left pretending to be a track.
17. As a listener, I want a track that was mid-download when the server stopped to be queued again rather than
    stuck, so that a restart does not lose work silently.
18. As a listener, I want the stored audio to be seekable from the first second, so that jumping into a track
    works immediately.
19. As an operator, I want one video id to map to exactly one stored file, so that the media store cannot
    accumulate duplicates.
20. As an operator, I want the worker to be stoppable with the server, so that a shutdown is clean.
21. As an operator, I want the download concurrency to be configurable, so that the instance can be tuned for
    its connection.
22. As an operator, I want a failed download to be logged with its reason, so that a fault is diagnosable
    without a debugger.

## Implementation Decisions

- **The queue is the track rows.** A track with `fileStatus: pending` and no stored file is a unit of work.
  There is no jobs table, and this spec does not introduce one: the rows already carry the state, the queue
  position is the `file_status` index, and a second table would be a second thing to keep in step.
- **The worker is in-process, single-slot, and stoppable**, which the existing handle already models. One
  claim loop, a concurrency cap from configuration, and no separate service to deploy. The server is one Node
  process, so two workers cannot exist, and the single-process property is what lets a claim be a conditional
  update rather than a distributed lease.
- **The worker it replaces is the loop that exists.** `startDownloadWorker` already owns the interval and the
  stop handle and does nothing else. This spec replaces its empty tick with the claim, the fetch and the state
  transitions, and adds no second scheduler.
- **A claim is one conditional update.** A worker takes a batch of pending track ids and moves each from
  `pending` to `downloading` only if it is still `pending`, and processes only the rows it actually moved. Two
  passes over the same rows therefore cannot both start the same download, even if the cap allows it.
  _Decided here:_ the claim is where the atomicity lives, and nothing else needs a lock.
- **A download writes to the temporary directory and is moved into the media store in one step.** The adapter
  writes under the media root's `.tmp` directory, remuxes for faststart without re-encoding, and the finished
  file is moved to `media/<first two characters of the video id>/<video id>.m4a`. A crash therefore leaves a
  temporary file and no stored file, never a stored file that is half written. The startup sweep already
  empties the temporary directory and returns interrupted downloads to `pending`, so a restart is a recovery
  rather than a repair.
- **The stored format is AAC in an M4A container, fetched at the source's own quality and never re-encoded.**
  The remux moves the container and writes the faststart index; it does not touch the audio stream. This is
  the constraint that makes the file play natively in a browser without a transcoder anywhere in the stack.
- **A track is fetched at most once per instance, whatever asked for it.** A track whose `fileStatus` is
  `stored` is never queued, including when a second playlist or a second account associates it. Deduplication
  is keyed by video id alone, which the unique constraint on the track's video id already enforces, so the
  same audio cannot exist twice under two rows.
- **A stored track needs no new claim when another playlist wants it**, so a second account's sync creates
  associations over rows that are already playable. The user sees the track immediately, with no wait and no
  second request to the source.
- **Success writes three things together:** `fileStatus: stored`, the stored path, and a cleared
  `failureReason`. The thumbnail is fetched in the same pass and is best effort: a thumbnail that fails to
  download leaves `thumbnailPath` null and does not change the file status, because a missing picture is a
  cosmetic loss and a failed audio fetch is not.
- **Failure writes `fileStatus: failed` and a short `failureReason` a person can read.** The reason is a
  summary, not a stack trace and not raw tool output, because it is rendered in a track row. A failed track is
  retried by the next sync, which returns it to `pending`; it is not retried on a timer, so nothing runs
  behind the user's back.
- **A failure that means the video is gone is terminal, and is not a failure.** It sets `sourceStatus: removed`
  and, when there is no stored file, `fileStatus: unavailable`; a track that is already stored keeps its file
  and only its source status moves, which is exactly the remote-removed state. This spec does not decide that
  rule: [`01-sync-a-playlist`](01-sync-a-playlist.md) owns it, and this spec reuses the same classification so
  both paths reach the same pair of values.
- **A track whose video left the source while still pending never enters the queue at all.** The reconcile
  makes it `unavailable` directly, so the worker's only inputs are tracks that are expected to succeed or to
  fail transiently.
- **The worker's inputs are exactly `pending` tracks with no stored file.** Anything else is a bug rather than
  a case, so the claim query is narrow and the loop has no branches over statuses.
- **The worker polls rather than being woken.** The interval the loop already owns stays, and it is a small
  fraction of the time a download takes, so the delay between a track being created and being claimed is not
  perceptible. _Decided here:_ the alternative, a notification from the sync, adds a coupling between two
  features for a delay nobody can see.
- **The web client learns about a store the same way it learns about a sync.** Nothing pushes a track's state
  to the browser; the playlist read carries the file and source status, and the client refetches while work is
  in flight. [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns that loop.
- **Inherited constraints are owned by the architecture and not restated here:** no transcoding, ever, and the AAC/M4A store ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)), identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Testing Decisions

- **One seam, at the highest point available.** The real app over a temporary database and media root, with a
  fake YouTube adapter that returns a real file in the temporary directory instead of fetching one. The
  worker's effects are then observable the way a user observes them: a file on disk, a row's state, and the
  stream route answering with audio.
- **What makes a good test here** is the resulting state and the bytes served, never the sequence of tool
  invocations. A test that asserts a faststart remux ran is testing the adapter, which has its own tests; a
  test that plays nothing and asks the stream route for bytes is testing the feature.
- **The cases that must exist:**
  - a pending track is claimed, downloaded, stored, and becomes streamable with its path and a cleared failure
    reason;
  - the stored file lands at the sharded path the media store defines, and its bytes are what the stream route
    serves;
  - a second track with the same video id does not create a second row and does not trigger a second download;
  - a second association to a stored track is immediately streamable with no download;
  - a failing download leaves `failed` with a reason, and the next sync returns it to `pending` and it is
    retried;
  - a failure classified as gone sets `sourceStatus: removed` and `unavailable` when there is no file, and
    keeps the file when there is one;
  - a thumbnail that fails leaves `thumbnailPath` null and the track `stored`;
  - a track already `stored` is never claimed, whatever the queue contains;
  - the startup sweep empties the temporary directory and returns an interrupted `downloading` track to
    `pending`;
  - the concurrency cap is respected, observed as no more simultaneous downloads than configured;
  - stopping the worker leaves no download in flight and the server closes cleanly.
- **Prior art:** the existing server route tests build the real app over a temporary database and media root
  and assert against the contract schemas; the adapter's own tests assert on the arguments built for the tool,
  which is the level below this one and stays there. The fake adapter substitutes at the same interface the
  sync tests use, so one fake serves both features.

## Out of Scope

- Concurrent downloads above the configured cap, and any adaptive rate limiting beyond what the adapter's
  options already carry.
- Retrying on a timer. A failed track waits for a sync.
- Resuming a partial download. A restart begins again.
- Any format other than the source's own AAC in an M4A container, and any post-processing of the audio.
- Thumbnails beyond the source's own, and any artwork the user supplies.
- The streaming route's authorisation and range behaviour, which already exist and are specified in
  [`07-play-stored-audio`](07-play-stored-audio.md).
- Reading the source to decide what to download, which [`01-sync-a-playlist`](01-sync-a-playlist.md) owns.
- The client's live view of a download in flight, which
  [`09-keep-the-screens-current`](09-keep-the-screens-current.md) owns.
