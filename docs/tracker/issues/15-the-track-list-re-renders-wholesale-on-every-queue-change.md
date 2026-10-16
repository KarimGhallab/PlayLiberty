# 15: The track list re-renders wholesale on every queue change

**State:** `resolved`
**Category:** `enhancement`

## Outcome

A queue change now re-renders the rows it affects and no others. The baseline, measured by `PlaylistDetailPage.test.tsx` counting renders per row through a spy on `formatDuration`, was three of three rows on a queue change and on a play/pause change, and after the change the same test passes with one of three. `TrackRow` is wrapped in `memo`, and `playTrack`, `removeTrackDeferred`, `retryTrack` and `fetchWholeTrack` are `useCallback`s so the four callbacks a row receives are referentially stable, with `playTrack` reading the store through `getState()` instead of closing over `currentId` and `isPlaying`. `playing` is passed as `isCurrent && isPlaying`, so the global `isPlaying` cannot change every row's props on a play or a pause, while `association`, `current`, `pending` and `busy` were already stable per row.
