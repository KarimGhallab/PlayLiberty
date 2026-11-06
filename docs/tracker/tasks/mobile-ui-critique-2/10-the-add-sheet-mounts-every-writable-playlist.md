# 10: The add sheet mounts every writable playlist

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The add-to-playlist sheet maps every writable playlist into a `ScrollView`, filled from the first page of the library
query, which asks for 200. A 200-playlist account mounts 200 rows and 200 pressables before the sheet is usable. The
share account picker repeats the pattern per loaded page.

## Expected

The picker virtualises like every other list in the app, and the sheet opens on a bounded number of rows.

## Evidence

- `apps/mobile/src/views/playlist/AddTrackSheet/AddTrackSheet.tsx:248-264`.
- `apps/mobile/src/views/library/ShareAccountPicker/ShareAccountPicker.tsx:223-244`.
- `apps/mobile/src/api/usePlaylists/usePlaylists.ts:12`: `PAGE_SIZE = 200`.

## Acceptance criteria

- [x] Both pickers render with a virtualised list.
- [x] Opening either sheet with 200 candidates mounts a bounded window.
- [x] Selection state survives scrolling.
- [x] The focused row is scrolled into view for a screen reader.

## Verification

Seed a 200-playlist account, open the add sheet, and count mounted rows from a React DevTools pass or a test that
asserts the window size. Then `pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
