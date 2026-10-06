# 15: The track list re-renders wholesale on every queue change

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** Nothing in the web client is memoized, and the detail page passes fresh inline callbacks to every track row, so a queue change re-renders the whole list.

**Current behavior:**
There is no `memo`, `useMemo` or `useCallback` anywhere in the client. The detail page subscribes to several player-store slices and builds its row callbacks inline, so every one of them is a new function identity on each render. `TrackRow` is not memoized, so a skip, a play/pause, or any of those store changes re-renders the page and all of its rows, even though a row's own props did not change. The position tick is isolated to the player bar, so this is per-track-change rather than per-frame, and a short playlist does not feel it; the risk is the long playlist the product is built for.

**Desired behavior:**
A queue change re-renders the rows it affects, not the whole list: the current row's mark and the play/pause state update, and the other rows are skipped. The row is memoized and the callbacks it receives are stable, or the store actions are passed down directly so the identities do not change per render. The list's behavior is otherwise identical.

**Key interfaces:**

- `TrackRow`'s props, in particular the callbacks the detail page builds inline.
- The detail page's store subscriptions.
- The shared helpers (`toPlayerTracks`, `orderTracksByQueue`, `nextIndex`) are unchanged.

**Acceptance criteria:**

- [x] A measurement first: the React profiler (or a render-count assertion) shows how many rows re-render on a queue change before any change.
- [x] After the change, a queue change does not re-render rows whose props are unchanged.
- [x] The list still updates the current row's mark and the play/pause state on that change.
- [x] A test asserts the reduced re-render (or the memoization contract).
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Virtualization; only worth it if a playlist is genuinely huge, which is a separate decision.
- The player store's shape or its selectors.
- The position-tick path, which is already isolated to the player bar.

## Outcome

Done. A queue change now re-renders the rows it affects and no others.

Measurement, before the change: `PlaylistDetailPage.memo.test.tsx` counts renders per row by spying on `formatDuration`, which each row calls once with its own duration, and the three fixture tracks have distinct durations. Run against the old code, both cases failed with `track-1` and `track-3` also re-rendering, so the baseline was three of three rows on a queue change and on a play/pause change. After the change the same test passes with one of three.

- `TrackRow` is wrapped in `memo`.
- `PlaylistDetailPage`: `playTrack`, `removeTrackDeferred`, `retryTrack` and `fetchWholeTrack` are `useCallback`s, so the four callbacks a row receives are referentially stable. `playTrack` reads the store with `getState()` instead of closing over `currentId` and `isPlaying`, because closing over them would mint a new function on every queue change and re-render every row.
- `playing` is passed as `isCurrent && isPlaying`. It is only read by a current row, so a non-current row is told `false`; the global `isPlaying` would otherwise change every row's props on a play or a pause.
- The `association`, `current`, `pending` and `busy` props were already stable per row, so the memo comparison now skips the rest.

Test: `PlaylistDetailPage.memo.test.tsx`, two cases, one of three rows re-renders on a queue change and one on a play/pause change. The row's mark and label still update, which the existing detail suite covers.

Verification: `pnpm run lint` clean; `pnpm run test:unit` all pass (web 358); the server build and the web typecheck are clean. Not committed.

## Observed

- No `memo` / `useMemo` / `useCallback` in `apps/web/src`.
- The detail page selects `currentId`, `isPlaying`, `shuffle`, `queue`, `queuePlaylistId` and `hasNext`, and passes inline callbacks to each row.
- `TrackRow` is a plain function component, so every parent render re-renders every row.

## Expected

A queue change re-renders the affected rows only, so a long playlist stays smooth while the current row and the play/pause state still update.

## Evidence

- Grep for `useMemo|memo\(|React\.memo|useCallback` across `apps/web/src`: no matches.
- The detail page's store selectors and inline row callbacks.
- Impeccable audit, P3 "No memoization on the hot list path".
