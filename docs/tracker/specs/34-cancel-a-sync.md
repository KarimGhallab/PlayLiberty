# Cancel a sync

Status: ready
Labels: `enhancement`, `ready-for-agent`

## Problem Statement

A sync starts in the background, and the playlist immediately reads as syncing. The playlist and the sync run are committed as `syncing` and `running` before the background reconcile starts, and only that reconcile writes a terminal state. If the server process stops first, whether from a deploy, a crash, an out-of-memory kill or a host restart, both rows stay as they were. The playlist is stuck reading as syncing forever.

There is no recovery. The next sync request is refused because a `running` run already exists, the gallery excludes a `syncing` playlist from Sync all, and the detail sync control is disabled while the row says syncing. The only ways out are a manual database edit or deleting the playlist and adding its source again, which loses its curation.

The same gap exists while the server is healthy. A sync that is slow cannot be stopped by the person who started it. The source listing is bounded by a timeout, but the only action during a run is to wait.

## Solution

Two controls over the same state.

At boot, before the download worker starts, the server fails every `running` sync run and marks every `syncing` playlist as `error`. An interrupted sync is then visible, retryable, and cannot block the next one.

While the server is live, an account with write access can cancel the running sync from the playlist detail's run band. The cancel commits immediately: the run becomes `cancelled`, the playlist returns to `idle`, and the background reconcile stops at its next checkpoint without writing associations, tracks, downloads, or a second terminal state. The remote source read is not aborted, so it may run to its existing timeout; its result is discarded. Existing downloads are untouched, and a cancelled run queues no new ones.

The gallery and the detail update through the existing `PlaylistChanged` event. A cancelled run is shown as "Sync cancelled", not as a source failure, and the playlist can be synced again immediately.

## User Stories

1. As an owner, I want a sync interrupted by a deploy or crash to stop reading as syncing, so that I can start a new sync without editing the database.
2. As a write collaborator, I want to cancel a sync I started, so that I do not have to wait for a slow source read to finish.
3. As an owner, I want to cancel a sync started by another account, so that a running run cannot hold my playlist indefinitely.
4. As a reader on a shared playlist, I want a cancelled run to read as cancelled rather than failed, so that I do not chase a source problem that does not exist.
5. As a user, I want the playlist to return to idle after a cancel, so that playback, curation and the next sync are available again.
6. As a user, I want the cancelled run to keep its finished time, so that the run band can say when it stopped.
7. As a user, I want the cancelled run to keep zero counts, so that the band never claims work that was not applied.
8. As a user, I want `lastSyncedAt` to stay unchanged on a cancel, so that "last synced" still describes the last run that finished.
9. As a user who never synced a playlist, I want a cancelled first sync to return the playlist to its empty state, so that I can try again from the same starting point.
10. As a user, I want a cancelled run to leave the gallery's Syncing group, so that the library no longer presents it as working.
11. As a user, I want the playlist to rejoin the Sync all set after a cancel, so that a bulk sync can pick it up.
12. As a user, I want a boot-recovered playlist to show a failure, so that I know the sync did not finish.
13. As a user, I want a boot-recovered playlist to be retryable, so that a restart costs one press and not a lost playlist.
14. As a user, I want the boot recovery to leave `lastSyncedAt` unchanged, so that a restart does not forge a sync.
15. As a user, I want the boot recovery to leave associations, tracks, downloads and media alone, so that recovery repairs state without losing content.
16. As a user, I want the boot recovery to run before downloads resume, so that a stale run cannot race the worker.
17. As an operator, I want the boot recovery to run even when background jobs are disabled, so that a headless boot and the test harness do not retain stale state.
18. As a user, I want the cancel request to commit the terminal state before it answers, so that the playlist is recovered even if the source read hangs.
19. As a user, I want the cancel to stop the reconcile before it writes associations or tracks, so that a cancel leaves no partial result.
20. As a user, I want the reconcile to stop before it queues downloads when the run was cancelled, so that a cancel does not start new work.
21. As a user, I want a source read that fails after a cancel not to overwrite the cancel, so that a late failure does not turn the run into an error.
22. As a user, I want a source read that succeeds after a cancel not to overwrite the cancel, so that a late success does not resurrect the run.
23. As a user, I want a cancel after the sync already completed to be a silent success, so that a stale screen does not show an error.
24. As a user, I want a second cancel request to be a silent success, so that a double press cannot fail.
25. As a user, I want the cancel to leave existing pending and downloading tracks alone, so that stopping a sync does not stop unrelated download work.
26. As a user, I want a cancelled run to queue no new downloads, so that cancel means no new work from that run.
27. As a user, I want the cancel control only while a run is actually running, so that I never press it against nothing.
28. As a reader, I want no cancel control, so that the interface does not offer a command I cannot perform.
29. As a write collaborator, I want the same cancel authority I have for starting a sync, so that the two directions of the verb agree.
30. As a user, I want the run band to hold the only Cancel control, so that the detail does not show several buttons that do the same thing.
31. As a user, I want the other sync controls to stay disabled while a run is running, so that I cannot start a second run from another affordance.
32. As a user, I want the Cancel button to read "Cancelling..." and disable while the request is pending, so that I know the press registered.
33. As a user, I want the run band's stamp to keep reading "Syncing" while the request is pending, so that it describes the server, not my intent.
34. As a user, I want a failed cancel to keep the run syncing and show the problem, so that I can retry without losing the run.
35. As a user, I want no success toast after a cancel, so that the visible change from syncing to cancelled is the feedback.
36. As a user, I want the detail and the gallery to refresh after a cancel, so that another tab or another client sees the same state.
37. As a user, I want the cancel to work from the detail on both web and mobile, so that the two clients present the same verb.
38. As a user, I want the Cancel button to have an accessible name that names the action and the playlist, and to expose its busy state, so that assistive technology describes it correctly.
39. As a user, I want a cancel request for a playlist I cannot write to answer as not found, so that the route does not confirm its existence.
40. As an owner, I want the boot recovery and the cancel to be single transactions, so that a crash mid-repair or mid-cancel cannot leave the run and the playlist disagreeing.
41. As an operator, I want no new live event type, so that clients keep one invalidation path for playlist state.
42. As an operator, I want the boot recovery to be idempotent, so that repeated starts with no stale rows change nothing.
43. As a user, I want a sync started after a cancel to behave exactly like a normal sync, so that cancel does not change the sync contract.
44. As a user, I want a cancelled run not to be retried automatically, so that the next run is the one I choose to start.
45. As a user, I want the remote source read to continue to its existing timeout after a cancel, so that no new agent protocol or process kill is required for the cancel to work.
46. As a user, I want a cancelled run to be absent from the running state even if the remote read has not returned, so that the row and the work can disagree without blocking me.

## Implementation Decisions

### Run and playlist state

- `SyncRunStatus` gains `cancelled` alongside `running`, `completed` and `failed`. The database column is text and typed by the enum, so no schema migration is needed. The contract schema accepts the new value. _Decided here:_ a cancel is a distinct terminal outcome, not a `failed` run with a parsed error sentence.
- A user cancel writes the run as `cancelled`, with `finishedAt` set, `error` null, and the counts left at their initial zero. The playlist becomes `idle`, with `updatedAt` set and `lastSyncedAt` unchanged. The playlist counts and associations are not rewritten.
- A boot interruption writes the run as `failed`, with `finishedAt` set and the error "The sync was interrupted by a server restart." The playlist becomes `error`, with `updatedAt` set and `lastSyncedAt` unchanged. _Decided here:_ an interrupted run is a failure, not an idle state, because the user asked for a sync and it did not finish.
- There is no new playlist sync status. `idle`, `syncing`, `error` and `blocked` remain the whole set; a cancelled run is represented by the run, and the playlist is idle.
- The glossary's Sync run row gains `cancelled`, and a Cancel entry is added under Sync and lifecycle. Use the British spelling `cancelled`, matching the vocabulary already used in the repository.

### Boot recovery

- One sync-owned recovery function runs during app readiness, after migrations and before the download worker starts. It runs even when background jobs are disabled.
- The recovery is one transaction with two unconditional writes: every `running` sync run becomes `failed` with the interruption error and `finishedAt`, and every `syncing` playlist becomes `error` with `updatedAt`. The two writes are independent, so an orphan on either side is repaired. _Decided here:_ the sweep does not join the two sets, because an orphan on either side must not survive a restart.
- The recovery runs on every boot, not only after an abrupt stop. The one-process architecture means no reconcile can be live when readiness runs, so every `running` row is stale by construction.
- The recovery publishes no event. A client that connects afterwards receives the existing `ready` invalidation; a client already connected during a restart reconnects and receives it too.
- The recovery does not touch associations, tracks, track files, media, downloads or `lastSyncedAt`.
- The recovery is idempotent: a second boot with no stale rows writes nothing observable.

### Cancel route

- The command is `DELETE /api/v1/playlists/:playlistId/sync`, bodyless, declared with the existing command endpoint shape. It answers `204` with no body. _Decided here:_ the path is the sync resource itself, so starting and cancelling are the `POST` and `DELETE` verbs on one path.
- Access is the existing write rule for sync: the owner or a `write` collaborator. A read collaborator and a stranger answer `404`, the same not-found shape the sync start uses, so the route confirms nothing. The existing identity and CSRF hooks apply; no exemption is added.
- An unknown playlist answers `404`. A playlist with no `running` run answers `204` with no writes and no event. This makes the command idempotent from a stale screen. _Decided here:_ an already terminal run is not a refusal.
- The command targets the playlist's current run, not a run id, because one playlist has at most one running run.
- One transaction: select the `running` run for the playlist; if none, return `204`; otherwise update every `running` run for that playlist to `cancelled` with `finishedAt`, and set the playlist to `idle` with `updatedAt`. The invariant allows at most one running run, and updating every match keeps the repair correct if the invariant is ever violated.
- Publish `PlaylistChanged` only when a run actually transitions. A no-op publishes nothing.
- No new problem code and no `409`. A run that is already terminal is not a refusal.
- _Decided here:_ cancellation is authoritative and database-only. The route owns the terminal state; the background reconcile checks status and cannot overwrite it. The route does not abort the source read or the download queue.
- The route does not stop, pause or delete downloads. A cancelled run never queued any because its final transaction is skipped; downloads from earlier runs continue. _Decided here:_ download control is a separate feature; cancel is run-only.

### Reconcile checkpoints

- After the source listing resolves, the reconcile reads the run. If it is no longer `running`, it returns without writing or announcing.
- As the first operation inside the final transaction, before any suppression, association, track or queue write, the reconcile reads the run again. If it is no longer `running`, it returns without writing or announcing. This makes the invariant local to the transaction rather than depending on the absence of interleaving.
- The success writes remain conditional on the run still being `running`. If they update nothing, no success announcement is published and no download kick is issued.
- The catch path also checks the run before writing a failure. If a previous cancel already made the run terminal, the late source failure is discarded rather than overwriting `cancelled` with `failed`. This is required because the source listing can reject after the cancel.
- The route and the reconcile are the two writers of a terminal state. The run row's status is the arbiter; the last writer cannot overwrite a terminal state it does not own.
- A cancel that lands after the final commit is a no-op, because the run is already `completed`. The route answers `204`.

### Client behavior

- The shared API client gains one cancel command and one shared mutation. Both clients use it; each supplies only its existing auth adapter.
- The control is offered only on the playlist detail, only when the latest sync run is `running`, and only when the account may write the playlist. The run band is the owner: the web run band and the mobile run band each gain the action. A missing latest-run read or a `404` shows no control, even if the coarse playlist status says `syncing`. _Decided here:_ one cancel surface, so no duplicate buttons and no gallery action.
- While a run is running, every other sync affordance on the detail stays disabled, including the web header sync control, the web header menu's Sync now item, the mobile header control, and the mobile floating dial action. No second affordance is turned into a cancel.
- Cancelling does not ask for confirmation. _Decided here:_ the run is retryable and no content is lost, so a dialog would add friction without protecting anything.
- The pending state is per playlist. While the run is running, the run band's button reads "Cancel sync"; while the request is pending it reads "Cancelling..." and is disabled. The run band's status stamp continues to read "Syncing" until the refetch lands. There is no optimistic playlist or run patch.
- On `204`, the client invalidates the playlist, the latest run and the library. No success toast is shown. A no-op `204` takes the same silent refresh path. _Decided here:_ the visible state change is the feedback.
- On a failed request, the button returns to "Cancel sync", the run keeps reading as syncing, and the existing problem surface carries the failure: the web notice toast and the mobile notice, with the message "Could not cancel the sync" and the problem detail when present.
- After a cancel, the run band shows a neutral "Sync cancelled" stamp at the run's finished time, with no counts and no retry action. The playlist is idle, the library row leaves the Syncing group, no failure state is shown, and the row is included in the next Sync all.
- A never-synced playlist whose first run was cancelled returns to the empty state; `lastSyncedAt` remains null. The cancelled run remains the latest run for the band wherever the band is shown.
- The cancel control has an accessible name that names the action and the playlist, and exposes its disabled and busy states through the existing control conventions.
- English copy is "Cancel sync", "Cancelling...", "Sync cancelled" and "Could not cancel the sync". French uses the established sync vocabulary. The new keys are added to both languages.
- No gallery, bulk or operator cancel is added. A user who only sees the gallery opens the playlist to cancel.

### Contracts and events

- The contracts add the new run status, the cancel endpoint, and its response shape. No new live event type is added; `PlaylistChanged` is the invalidation hint.
- The latest-run read continues to return the terminal run, so the band can show `cancelled`. The client's existing query invalidation covers the latest-run key because it is prefixed by the playlist key.
- The client treats an absent latest-run read as no run, so the cancel control is absent for the transient creation placeholder and for a playlist that has never synced.
- No new database migration is required. The run status column is text; the contract and client switches are the compile-time guards.
- This spec amends spec `01`'s sync-run vocabulary with `cancelled` and its terminal-transaction rule with the cancel and boot-recovery writers. Every other sync decision stands.

## Testing Decisions

A good test asserts the state a client reads, not the shape of the writes that produced it. The server is tested at one seam: the Fastify app over a real temporary SQLite database, using the existing test context. Boot recovery is exercised by rebuilding the app over the same database, which runs readiness again; cancel is exercised through injected HTTP requests. No test calls the recovery function or the reconcile in isolation, and no test asserts SQL or transaction internals.

The web and mobile clients are each tested at their playlist-detail screen seam with the real query client and a stubbed transport. The run band component tests own its labels, disabled state and cancelled stamp; the screen tests own the request, the pending state, the failure notice and the invalidation. There is no separate test of the shared mutation for forwarding a value.

Server tests, one owner per behavior:

- Boot with a `running` run and a `syncing` playlist: after readiness, the playlist reads `error`, the latest run reads `failed` with the interruption sentence and a finished time, and a new sync request is accepted and completes. This is the assembly test for the recovery promise.
- Boot with a `syncing` playlist and no running run, and with a `running` run on an idle playlist: both sides are repaired.
- Boot with no stale rows: no playlist or run changes.
- Cancel a running run while the source listing is still gated: the response is `204`, the run is `cancelled` with a finished time and null error, the playlist is `idle`, `lastSyncedAt` and counts are unchanged, and a new sync is accepted.
- Release the gated listing after a cancel: the run stays `cancelled`, no associations or tracks are added, and no download kick is issued.
- Fail the gated listing after a cancel: the run stays `cancelled` and the playlist stays `idle`; the late failure is discarded.
- Cancel after completion and cancel twice: both answer `204` and leave the completed or cancelled state unchanged.
- A reader and a stranger cannot cancel and read the playlist as not found; a write collaborator can.
- A pending track associated with the playlist before the cancel is still `pending` after the cancel; the cancel changes no track file state.
- A cancel announces `PlaylistChanged` once on a transition and nothing on a no-op; the test subscribes to the existing event bus and asserts both.

Web tests:

- A running latest run shows the Cancel action in the run band; the header sync control and the menu Sync now item are disabled; the action has the playlist in its accessible name.
- Pressing Cancel calls the cancel command, shows "Cancelling..." and disables the action; a `204` followed by a refetch shows the cancelled stamp, an idle playlist and no toast.
- A failed cancel shows the notice toast with "Could not cancel the sync", keeps the syncing state and re-enables the action.
- A read-only share and a playlist whose latest run is not running show no Cancel action.
- The gallery row leaves the Syncing group after the refetch and the row is included in Sync all.

Mobile tests:

- The run band shows Cancel only for a running latest run; the header control and the floating dial action stay disabled.
- Pressing Cancel calls the command, shows "Cancelling..." and disables the action; a `204` and refetch show the cancelled stamp and the idle playlist.
- A failed cancel shows the notice with "Could not cancel the sync" and keeps the syncing state.
- The cancelled stamp is neutral, has no retry, and the row leaves the Syncing group.

Prior art: the sync service tests already gate a fake source and wait for a run to settle; the route tests already cover write-access and not-found refusals; the startup sweep tests already prove a boot-time repair; the web detail tests already cover notices and disabled sync controls; the mobile detail and run band tests already cover the running and failed branches; the gallery tests already cover the Syncing group and the syncable set.

## Out of Scope

- Stopping, pausing or deleting downloads, including in-flight downloads. Cancel is run-only.
- Aborting the source read, killing a local yt-dlp process, or adding a cancel message to the egress agent protocol. The read is time-bounded and its result is discarded.
- A run lease, heartbeat, ownership token or automatic timeout for a run whose process is alive.
- Cancel by run id, cancel all, bulk cancel, gallery cancel, and an operator cancel surface.
- A new playlist status, a new problem code, a new live event type, or a new refusal for a run that is already terminal.
- Automatic retry after a boot recovery or a cancel. The next sync is a manual action.
- Multi-process deployment recovery. The one-process invariant is assumed; a future multi-process deployment would need a lease or an owner token before this recovery is safe.
- Fixing the six-second creation placeholder or any other client-only stale `syncing` display. A cancel control is not shown when the latest run is absent.
- Notifications, telemetry, audit events, and metrics for cancels or recovered runs.

## Further Notes

- The recovery is safe because the architecture has one server process and one database writer. If a second process is ever added, readiness in one process would fail runs that are live in another; a lease or owner token becomes a prerequisite, not an optimization.
- A cancel does not wait for the source read. The remote work may continue to its existing timeout, and its result is discarded at the checkpoint. This is deliberate: the row must recover even when the read is the thing that hangs.
- The boot recovery surfaces a server-owned English sentence through the existing raw-error surface. It is not localized, matching the existing failure strings.
- The run band is the single cancel surface by design. A user who only sees the gallery must open the playlist; that keeps the gallery unaware of run ids and avoids a no-op action against the creation placeholder.
- The cancelled run remains in the run history as the latest run until a new run replaces it. It is not retried automatically.
- `lastSyncedAt` remains the fact of the last completed or failed run. A cancelled run is not a sync that happened, so it does not move the value.
