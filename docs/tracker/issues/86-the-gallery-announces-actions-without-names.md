# 86: The gallery announces actions without names

**State:** `resolved`
**Category:** `bug`

## Outcome

The gallery's play and pause name their playlist through the new `header.playNamed` and `header.pauseNamed` keys (`Play {name}`, `Pause {name}`), so seven cards no longer announce the same sentence. The detail keeps the page-scoped `header.play` and `header.pause`, where the heading already names the playlist.

The item's identity now precedes its controls in DOM order. The card is a two-row grid with the cover first visually, and the tile is a grid whose cover row holds the play; both keep their previous visual order. `TrackRow` renders its play layer before its lane. The incomplete badge leaves the tab order and keeps its `aria-label`; its keyboard-only tip went with the tab stop, and hover still shows it.

Tests: the tile and card item assert the name precedes every control; `TrackRow` asserts the play precedes the lane; `IncompleteBadge` asserts no `tabindex` while the label still speaks. The gallery unit, page and e2e labels use the named play.

Verification: `pnpm run build` and `pnpm run lint` pass; the web suite is 520 passed across 51 files; `pnpm test:e2e` is 37 passed.
