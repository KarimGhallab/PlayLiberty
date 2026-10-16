# 40: Presentation and DOM-structure assertions

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The web suite no longer asserts styling or markup detail that no user behavior depends on. Sixteen test blocks and the presentation-only assertions came out of `PlaylistHeader.test.tsx`, `TrackRow.test.tsx`, `LibrarySkeleton.test.tsx`, `LibraryPage.test.tsx`, `PlaylistDetailPage.test.tsx`, `PlayerAudio.test.tsx` and `PlayerBar.test.tsx`; each cut whose behavior is owned elsewhere names its owner test, which stayed. The four replace candidates were resolved: `SyncSummary.test.tsx` was added, the router test now asserts playback rather than the DOM, and two layout-only cases were dropped.
