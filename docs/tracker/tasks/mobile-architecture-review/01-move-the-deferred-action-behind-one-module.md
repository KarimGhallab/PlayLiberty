# 01: Move the deferred action behind one module

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The playlist detail and the gallery each keep their own deferred action: a pending state, a timer, a hidden row and a commit. The detail also holds a grace timer after its snackbar ends. The web client already has one deferred action store, so the same concept has three owners across the two clients.

The detail waits for its sheet to exit before it opens the undo window. The gallery opens the window at once and sends the previous delete when a second one starts. Each screen writes that rule again.

## Expected

`@playliberty/library` exports the plain deferred action store: the window types, the open windows, the timer per window, the commit and the cancel. It uses `setTimeout` and no React. Each client subscribes through its own hook and draws its own snackbar or toast.

A surface defers an action and cancels it. A route change keeps the window. The detail may hold an action until its sheet exits, then defer it. The gallery derives its hidden rows from the open windows.

The detail and the gallery delete their pending state, timers and commit functions. The web client deletes its local store and imports the shared one.

## Evidence

`apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx` holds `commitPending` at line 1015, `expirePending` at 1043, `startPending` at 1065 and `undoPending` at 1088. It defines its own `PendingAction` union at line 122.

`apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx` holds `commitDelete` at line 475, `expireDelete` at 490, `startDelete` at 514 and `undoDelete` at 500.

`apps/web/src/shared/components/useDeferredAction/deferredActionStore.ts` is the existing store. `LibraryPage` and `PlaylistDetailPage` use it.

`packages/library/src/actions/playlistActions/playlistActions.ts` already owns `UNDO_WINDOW_MS` and `DeleteIntent`, so the store belongs beside them.

The report for this review is `/tmp/architecture-review-20261108-151358.html`, candidate 2.

## Acceptance criteria

- [x] `@playliberty/library` exports the store, the window type and the action type. It has no React dependency.
- [x] One timer owns each open window. A second window for the same action refreshes the first window.
- [x] The web library and detail keep their deferred delete behaviour through the shared store.
- [x] The mobile detail keeps the remove and delete undo behaviour, including the wait for the sheet exit and the grace before commit.
- [x] The mobile gallery keeps its rule: a second delete commits the first delete, then opens its own window.
- [x] The detail and the gallery hold no pending action, no hidden-row set and no commit timer.
- [x] The web-local store is deleted.
- [x] Policy tests move to the store. The surface tests keep only their rendering and wiring claims.

## Outcome

`@playliberty/library` exports the deferred action store with `PendingAction`,
`DeferredWindow`, `DeferOptions` and `DeferredAction`. The store owns one timer
per window, the refresh of the same action, the held window that waits for its
surface, the optional grace and the commit. It has no React import.

The web hook subscribes to the shared store, and the web-local store and types
are deleted. The mobile detail and gallery subscribe through one hook. The
detail holds its window until its sheet leaves, keeps the 150 ms commit grace,
and derives its hidden track from the window plus the in-flight removal. The
gallery derives its hidden playlists from its windows plus the in-flight delete,
and it commits its previous window when a second delete starts.

Verification: `pnpm run build`, `pnpm run lint:check`, `pnpm run test:unit`
(web 616, mobile 600, library 35, and the other packages), and a real-timer
smoke that showed a started window commit at 30 ms while a held one waited for
`startAll`. The gallery then gained its second-delete test, so the mobile suite
is 601.

## Verification

`pnpm --filter @playliberty/library test`, `pnpm --filter @playliberty/web test`, `pnpm --filter @playliberty/mobile exec jest src/views/playlist/PlaylistDetail src/views/library/PlaylistGallery`, `pnpm run build`, `pnpm run lint:check`.
