# 89: The bar height, the unpinned heading and the language control

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The player bar's height is one token, `player-bar-height` (98px). The bar, both pages, the floating action and the three toasts pay for it by name, so the reserve and the bar cannot drift. The library names the rest of the gallery "Others" when a pinned section sits above it; an account with no pins keeps the one unlabelled list, and an all-pinned gallery keeps its "Pinned" heading.

`LanguageMenu` moved to `shared/components/LanguageMenu` and is rendered in the library header and the detail's way-home row, so a deep-linked detail can switch language. The glossary records that the control sits on both the library and the playlist detail.

Verification: `pnpm run build` and `pnpm run lint` pass; the unit suites pass (tokens 2, i18n 39, youtube 31, ui-foundation 6, server 386, web 502); `pnpm test:e2e` is 35 passed.
