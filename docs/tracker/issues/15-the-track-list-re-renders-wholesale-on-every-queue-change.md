# 15: The track list re-renders wholesale on every queue change

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Done. A queue change now re-renders the rows it affects and no others.

Measurement, before the change: `PlaylistDetailPage.test.tsx` counts renders per row by spying on `formatDuration`, which each row calls once with its own duration, and the three fixture tracks have distinct durations. Run against the old code, both cases failed with `track-1` and `track-3` also re-rendering, so the baseline was three of three rows on a queue change and on a play/pause change. After the change the same test passes with one of three.

- `TrackRow` is wrapped in `memo`.
- `PlaylistDetailPage`: `playTrack`, `removeTrackDeferred`, `retryTrack` and `fetchWholeTrack` are `useCallback`s, so the four callbacks a row receives are referentially stable. `playTrack` reads the store with `getState()` instead of closing over `currentId` and `isPlaying`, because closing over them would mint a new function on every queue change and re-render every row.
- `playing` is passed as `isCurrent && isPlaying`. It is only read by a current row, so a non-current row is told `false`; the global `isPlaying` would otherwise change every row's props on a play or a pause.
- The `association`, `current`, `pending` and `busy` props were already stable per row, so the memo comparison now skips the rest.

Test: `PlaylistDetailPage.test.tsx`, two cases, one of three rows re-renders on a queue change and one on a play/pause change. The row's mark and label still update, which the existing detail suite covers.

Verification: `pnpm run lint` clean; `pnpm run test:unit` all pass (web 358); the server build and the web typecheck are clean. Not committed.
