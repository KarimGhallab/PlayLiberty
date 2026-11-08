# 15: The track list re-renders wholesale on every queue change

**State:** `resolved`
**Category:** `enhancement`

## Outcome

A queue change now re-renders the rows it affects and no others. `TrackRow` is wrapped in `memo`, and `playTrack`, `removeTrackDeferred`, `retryTrack` and `fetchWholeTrack` are `useCallback`s so the four callbacks a row receives are referentially stable, with `playTrack` reading the store through `getState()` instead of closing over `currentId` and `isPlaying`. `playing` is passed as `isCurrent && isPlaying`, so the global `isPlaying` cannot change every row's props on a play or a pause, while `association`, `current`, `pending` and `busy` were already stable per row.
