# 10: The add sheet mounts every writable playlist

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. Both pickers are `FlatList`s with the same bounded window: `initialNumToRender` and
`maxToRenderPerBatch` at 12, `windowSize` 5, and a key by id.

`AddTrackSheet` renders the ordered playlists straight from the list; `chosen` lives in the sheet, so a row that
remounts reads its tick from the same state. `ShareAccountPicker` renders the page's candidates the same way and moves
its loading note and next-page retry into `ListFooterComponent`; the existing `onScroll` load-more is kept, so the
paging behaviour does not change. The held level and a refusal also live above the list.

Only mounted rows can receive focus, and the mounted window is the visible one, so a screen reader never lands on an
unmounted row; the add sheet opens with the current playlist first, which is the row that matters at open.

The 200-row check is the ticket's test alternative: `AddTrackSheet.test.tsx` renders 200 playlists and
`ShareAccountPicker.test.tsx` 200 accounts, and both assert the mounted checkbox/row count is above zero and below 200.

The root build, lint and unit run follows in the batch for this session.
