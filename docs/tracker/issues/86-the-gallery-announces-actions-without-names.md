# 86: The gallery announces actions without names

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Every gallery card's play button is announced "Lire cette playlist" with no playlist name, the card's focus order puts the play action before the link that names the playlist, the row's lane precedes its full-row play, and the incomplete badge is a focusable element that does nothing.

**Current behavior:**
`usePlaylistHeader` labels the play from `header.play` (`'Lire cette playlist'`) while that card's shuffle and actions use `header.shuffle` and `header.actions` with `{name}`. `PlaylistCardHeader` and `PlaylistTileHeader` render the cover and its controls before `__munder`'s identity. `TrackRow` renders `__lane-slot` before `__hit`. `IncompleteBadge` is a `role="img"` with `tabIndex={0}` that opens nothing.

**Desired behavior:**
Every control carries the playlist's name, the item's name precedes its actions in DOM order, and the badge leaves the tab order while keeping its `aria-label`.

**Key interfaces:**

- The i18n catalog gains the named play string; `{title}` exists for tracks already.
- The DOM order change must not change the visual order.

**Acceptance criteria:**

- [ ] Each card's play button names its playlist.
- [ ] In DOM order a card reads name first, then its controls; a row reads its play before its lane.
- [ ] The badge is not a tab stop and is still announced.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The menu and dialog contracts, which already name their items.

## Observed

- Seven cards announce the same `Lire cette playlist`; shuffle and actions include the name.
- Focus order per card: play, name, share mark, badge, shuffle, menu.

## Expected

- Controls are distinguishable and ordered name-first.

## Evidence

- `packages/i18n/src/fr.ts:177-183`, `packages/i18n/src/en.ts:173-178`.
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:222-240,392-420`.
- `apps/web/src/views/library/IncompleteBadge/IncompleteBadge.tsx:70-95`.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
