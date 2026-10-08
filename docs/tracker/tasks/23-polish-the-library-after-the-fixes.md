# 23: Polish the library after the fixes

**Blocked by:** [`19`](19-record-the-items-deliberate-actions.md), [`20`](20-context-the-row-controls-and-trap-focus.md),
**Status:** resolved

## Outcome

All five, and one of them a record decision rather than a drawing change.

- **Bottom padding.** Both pages that dock the bar now end at `calc(97px + var(--space-5))`, the bar's own
  97px plus the gap the header uses above the list: the old 88px left the last row **9px** behind the bar.
  [The playlist detail](../../../apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.module.scss) had the
  same defect and the same false comment, so it was fixed with the library.
- **Loading.** [`LibrarySkeleton.tsx`](../../../apps/web/src/views/library/LibrarySkeleton/LibrarySkeleton.tsx) draws five
  rows of the item's own 136px, a 96px cover and two bars where the name and the sync line go, so the read
  resolves into the space rather than flashing text. The shapes are `aria-hidden` and the status sentence
  "Loading playlists." is the only thing read; reduced motion drops the pulse and leaves the shape.
- **The list's end edge.** The list keeps the header's between-rows rule and gains one closing hairline under
  the last row, so the gallery ends rather than running into the page; the top stays open because the page
  header opens it.
- **The refused message's weight.** `.field__message` is now `--weight-medium`, which lifts the refusal out
  of the body's regular without moving the line. The record's stale "one line, 24.2px" was corrected while
  there: the shipped 76-character sentence wraps to two lines and the invalid dialog is **296px**.
- **Fault repetition.** Decided, not changed: the dot is the sync line's own mark in every state, not a third
  statement of the fault, so the fault is the word and the hairline, which is the two the record already
  chose. Written into [`library.md`](../../../docs/design-system/screens/library.md).

Verification: `pnpm run build`, `pnpm run lint` and the web unit suite pass (web 226, server 224);
`validate-design-tokens.cjs` is OK. The skeleton's geometry was checked in the browser against its compiled
CSS (136px rows, 96px cover) and the specimen's closing rule and message weight were checked live. Not
committed.
