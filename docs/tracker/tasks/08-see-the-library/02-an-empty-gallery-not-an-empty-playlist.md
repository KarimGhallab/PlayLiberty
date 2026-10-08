# 02: An empty gallery, not an empty playlist

**Blocked by:** [`01`](01-the-list-and-the-item.md).
**Status:** resolved

## Outcome

Implemented and verified. `EmptyGallery` is a new view-local component under `src/views/library/`, because the library is its only consumer; the second consumer is what would promote it to `shared/`. It draws the heading `No playlists yet`, the promise as `.prose` at the system's reading width, and a primary `Add a playlist` control with the `plus` glyph, mirroring the library specimen.

`LibraryPage` now has four explicit states and no fifth: loading, a failed read, the empty gallery, and the populated list. The old `No playlists yet.` note in the empty branch is replaced by the gallery. The failed read keeps its own `role="alert"` sentence, so a broken read is never presented as an empty gallery.

The distinction the ticket is built on holds in the markup: the gallery's action is `Add a playlist` and never `Sync now`, and the playlist empty state is not drawn anywhere on the library, because the library only reaches it through the playlist detail, which does not exist yet. A playlist that exists and has never synced stays in the list and reads `Up to date` on its state and `Never synced` on its time, which is ticket 01's header and a different state from having no playlists at all.

One deliberate seam: the gallery's control is wired to a no-op placeholder on `LibraryPage`, with a comment naming ticket 03 as the ticket that opens the dialog. The action is present and labelled, which is this ticket's criterion; opening a dialog is ticket 03's.

Tests: four in `EmptyGallery.test.tsx` (the heading and action, no `Sync now`, the action firing, axe) and three added to `LibraryPage.test.tsx` (the empty gallery for an empty page, no playlist empty state, the error state instead of the gallery on a failed read). The two new library cases override the `GET /playlists` handler through MSW to return an empty page and a `503` problem.

Verification: `pnpm run test` (215 server, 12 youtube, 14 ui-foundation, 3 tokens, 29 web), `pnpm run build`, `pnpm run lint`, `npx depcruise .` (128 modules, 0 violations), `npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` all pass. No em dashes. Not committed.
