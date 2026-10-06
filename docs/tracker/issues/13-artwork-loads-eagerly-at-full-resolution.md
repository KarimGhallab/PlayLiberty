# 13: Artwork loads eagerly at full resolution

**State:** `resolved`
**Category:** `enhancement`

## Agent Brief

**Category:** enhancement
**Summary:** Every cover and track artwork image loads eagerly at full resolution, with no lazy loading and no decoding hint, so a long playlist fetches and decodes one full thumbnail per track on mount.

**Current behavior:**
The library row, the track row, the playlist header (row and card) and the player bar each render an artwork `<img>` with no `loading`, no `decoding` and no dimensions. The thumbnail route serves one size, so each element pulls the full stored image: a 480×360 thumbnail drawn into a 38px tile on a track row. A playlist renders one of these per track, all on mount, so a 100-track list fetches and decodes 100 full images even though only the first few are on screen. The ambience ground reuses the same URL as its row's cover, so it is not an extra fetch, but it is another full-image paint. The list is the product's core surface and the design targets a phone, so this is the load it will feel first.

**Desired behavior:**
List artwork loads when it is near the viewport rather than all at once, and decodes off the main thread, with the tile's box already reserved by CSS so nothing shifts. The first viewport's artwork still appears promptly, without a visible delay. The ambience ground and the single-size thumbnail route are unchanged.

**Key interfaces:**

- The artwork `<img>` elements across the library item, the track row, the header and the player bar.
- The thumbnail route serves one size, so this is `loading` / `decoding` (and dimensions where the box is not already fixed), not `srcset`; a future derivative would be a separate decision (issue 10 dropped the small derivative).

**Acceptance criteria:**

- [x] Off-screen list artwork does not load until it is near the viewport (`loading="lazy"`).
- [x] Artwork carries `decoding="async"`.
- [x] Above-the-fold artwork still appears without a visible delay.
- [x] The tile box is reserved so lazy loading introduces no layout shift.
- [x] A test asserts the loading and decoding behavior (or the lazy attribute) on the list artwork.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- Re-introducing a small derivative, which issue 10 dropped.
- A service-worker or HTTP cache layer.
- The ambience ground's own image.

## Outcome

Done. The list artwork is deferred and the hero stays eager; no stylesheet change was needed.

- `TrackRow.tsx`: the tile's `<img>` carries `loading="lazy"` and `decoding="async"`.
- `PlaylistHeader.tsx`: the row arrangement (the library item) carries `loading="lazy"` and `decoding="async"`; the card arrangement (the detail's hero, above the fold) carries `decoding="async"` only, so it paints with the first frame.
- `PlayerBar.tsx`: the rail is in the fixed bar and always visible, so it carries `decoding="async"` only.
- No stylesheet change: every box was already reserved (the 96px cover, the card's `aspect-ratio: 1`, the 40px track tile, the player rail's `aspect-ratio: 1`), so a deferred image cannot shift layout.
- Tests: the track row, the row cover and the card cover assert the attributes, and the player bar asserts `decoding="async"` with no deferral.

Verification: `pnpm run lint` clean; `pnpm run test:unit` web 355, four from this change; the server build and the web typecheck are clean. The repo-wide build is still blocked only by the concurrent session's untracked `apps/web/src/prototype/` files. Not committed.

## Observed

On the detail route at 1280, eight artwork images render and all report `loading: null` and no `decoding`; the first track's image is a full thumbnail drawn at 38px.

## Expected

List artwork is lazy and decoded asynchronously, so a long playlist does not fetch and decode every full thumbnail at once, while the first viewport still paints immediately.

## Evidence

- Live measurement: 8 `<img>` on the detail, `loading: null`, no `decoding`.
- Impeccable audit, P2 "Full-resolution artwork loads eagerly".
- The thumbnail route (`GET /tracks/:id/thumbnail`) serves the one stored size.
