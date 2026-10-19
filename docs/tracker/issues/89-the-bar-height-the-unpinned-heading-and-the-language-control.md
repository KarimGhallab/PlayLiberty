# 89: The bar height, the unpinned heading and the language control

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Three small residuals from the critique: the player bar is 98px while both pages reserve 97px, the unpinned gallery group has no heading after its rule, and the language control exists only on the library.

**Current behavior:**
`PlayerBar.module.scss` sets `height: 98px`; `LibraryPage.module.scss` and `PlaylistDetailPage.module.scss` both reserve `97px`, so about 1px of the last row hides under the bar. The library separates pinned from unpinned with a rule and no heading, so a heading list shows only "Epinglees". `LanguageMenu` is rendered only by `LibraryPage`.

**Desired behavior:**
The reserve matches the bar; the unpinned group is labelled for the heading list; and the language control's home is decided (library only, or both surfaces) and recorded.

**Key interfaces:**

- The reserve is a padding expression in two stylesheets; the bar's height is one declaration.
- If the language control moves, `LanguageMenu` becomes shared.

**Acceptance criteria:**

- [ ] The last row is fully reachable above the docked bar.
- [ ] A heading list in the gallery names both groups, or the single list stays unlabelled because it is one list.
- [ ] The language control's placement is decided and documented.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The bar's internal layout and the language resolution logic.

## Observed

- Bar 98px; reserve 97px in both page stylesheets.
- The unpinned group follows an `hr` with no heading.
- Deep-linking to a detail leaves no way to switch language without going home.

## Expected

- No off-by-one under the bar; both groups are named; the language control has one stated home.

## Evidence

- `apps/web/src/shared/player/PlayerBar/PlayerBar.module.scss:16`.
- `apps/web/src/views/library/LibraryPage/LibraryPage.module.scss`, `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.module.scss`.
- `apps/web/src/views/library/LibraryPage/LibraryPage.tsx:164-196`.
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
