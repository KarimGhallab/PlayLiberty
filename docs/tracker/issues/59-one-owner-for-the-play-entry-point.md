# 59: One owner for the play entry point

**State:** `resolved`
**Category:** `enhancement`

## Outcome

One module owns the play transition. `usePlayTransition` in `apps/web/src/shared/player/usePlayTransition/usePlayTransition.ts` answers `play`, `shuffle`, `playTrack`, `retry`, `starting`, `retryable` and `refusal`, and every surface calls it: the detail's header and rows, and the library's items. It replaces `useStartPlaylist` and the four local callbacks in `PlaylistDetailPage` (`startFrom`, `playTrack`, `playPlaylist`, `retryPlayback`), so the current-queue guard and the read-then-start sequence are each written once. The intent a press was made with is carried by the module, so a failed shuffle retries as a shuffle.

The read is the module's too: `readPlaylistQueue(queryClient, playlistId)` in `queries.ts` is the one place the queue key and its fetch are paired, and the detail no longer reads it.

The playable fact has one owner. `hasPlayableTrack({ counts })` in `playerQueue.ts` answers from the stored count of the whole playlist, beside the filter that builds the queue, and the header's `playable` prop is required so no arrangement can default it. The header no longer derives it from `trackCount`, which counts every association. A playlist whose tracks are all pending, failed or unavailable now draws a disabled Play instead of one whose press answers "empty". `PlaylistTileHeader` forwards the fact it previously dropped.

Observable behaviour is otherwise unchanged: a press on a playlist starts it in its own order or shuffled, a press on its own loaded queue toggles, a row press moves the playhead, and both refusals still return rather than draw. The detail draws its inline retry for an unread queue and no longer also raises the notice toast for the same failure.

Tests: `usePlayTransition.test.tsx` covers toggle, start, shuffled start, start-at-track, the empty refusal, the unreachable refusal with its retry, and the in-flight state; `hasPlayableTrack` is covered beside the queue build it must agree with; the header, detail and library suites each gained the disabled-Play case.
