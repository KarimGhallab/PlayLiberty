# 13: Artwork loads eagerly at full resolution

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Done. The list artwork is deferred and the hero stays eager; no stylesheet change was needed.

- `TrackRow.tsx`: the tile's `<img>` carries `loading="lazy"` and `decoding="async"`.
- `PlaylistHeader.tsx`: the row arrangement (the library item) carries `loading="lazy"` and `decoding="async"`; the card arrangement (the detail's hero, above the fold) carries `decoding="async"` only, so it paints with the first frame.
- `PlayerBar.tsx`: the rail is in the fixed bar and always visible, so it carries `decoding="async"` only.
- No stylesheet change: every box was already reserved (the 96px cover, the card's `aspect-ratio: 1`, the 40px track tile, the player rail's `aspect-ratio: 1`), so a deferred image cannot shift layout.
- Tests: the track row, the row cover and the card cover assert the attributes, and the player bar asserts `decoding="async"` with no deferral.

Verification: `pnpm run lint` clean; `pnpm run test:unit` web 355, four from this change; the server build and the web typecheck are clean. The repo-wide build is still blocked only by the concurrent session's untracked `apps/web/src/prototype/` files. Not committed.
