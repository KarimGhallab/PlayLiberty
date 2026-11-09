# Cancel a sync

Status: resolved
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

## Implementation Decisions

### Run and playlist state

- `SyncRunStatus` includes `cancelled` alongside `running`, `completed` and `failed`. The database column is text and typed by the enum, so no schema migration is needed. The contract schema accepts the new value. _Decided here:_ a cancel is a distinct terminal outcome, not a `failed` run with a parsed error sentence.
- A user cancel writes the run as `cancelled`, with `finishedAt` set, `error` null, and the counts left at their initial zero. The playlist becomes `idle`, with `updatedAt` set and `lastSyncedAt` unchanged. The playlist counts and associations are not rewritten.
- A boot interruption writes the run as `failed`, with `finishedAt` set and the error "The sync was interrupted by a server restart." The playlist becomes `error`, with `updatedAt` set and `lastSyncedAt` unchanged. The sentence is not localised, matching the existing failure strings. _Decided here:_ an interrupted run is a failure, not an idle state, because the user asked for a sync and it did not finish.
- There is no new playlist sync status. `idle`, `syncing`, `error` and `blocked` remain the whole set; a cancelled run is represented by the run, and the playlist is idle.
- The glossary's Sync run row lists `cancelled`; the Cancel entry under Sync and lifecycle owns the definition. Use the British spelling `cancelled`, matching the vocabulary already used in the repository.

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

- The shared API client has one cancel command and one shared mutation. Both clients use it; each supplies only its existing auth adapter.
- The control is offered only on the playlist detail, only when the latest sync run is `running`, and only when the account may write the playlist. The run band is the owner: the web run band and the mobile run band each carry the action. A missing latest-run read or a `404` shows no control, even if the coarse playlist status says `syncing`. _Decided here:_ one cancel surface, so no duplicate buttons and no gallery action.
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

- The contracts carry the new run status, the cancel endpoint, and its response shape. No new live event type is added; `PlaylistChanged` is the invalidation hint.
- The latest-run read continues to return the terminal run, so the band can show `cancelled`. The client's existing query invalidation covers the latest-run key because it is prefixed by the playlist key.
- The client treats an absent latest-run read as no run, so the cancel control is absent for the transient creation placeholder and for a playlist that has never synced.
- No new database migration is required. The run status column is text; the contract and client switches are the compile-time guards.
- This spec amends spec `01`'s sync-run vocabulary with `cancelled` and its terminal-transaction rule with the cancel and boot-recovery writers. Every other sync decision stands.

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
