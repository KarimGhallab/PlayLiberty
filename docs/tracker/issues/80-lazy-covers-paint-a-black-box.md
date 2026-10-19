# 80: Lazy covers paint a black box

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Every cover and the detail's own hero lazy-load while their box paints `--surface-raised`, so the gallery and the hero open as black squares until each image arrives, against `DESIGN.md`'s rule that the subject of its own screen loads eagerly.

**Current behavior:**
The tile and card images in `PlaylistHeader` set `loading="lazy"`, including the detail hero, which is the same card component with `item` unset. `__mart`, `__tart` and the track row's `__art` set `background-color: var(--surface-raised)`. The derived sleeve hue is already computed by `usePlaylistHeader` for the no-art case but is not used as the loading ground.

**Desired behavior:**
A cover that has not arrived yet paints the playlist's derived sleeve hue, and the detail's hero loads eagerly so the screen's subject is not the last thing to appear.

**Key interfaces:**

- `sleeveIndex` already derives the hue from the id; the art box carries `data-sleeve`.
- The image element keeps its `decoding` hint.

**Acceptance criteria:**

- [ ] A slow first paint shows the sleeve hue, not a black or grey square.
- [ ] The detail hero loads eagerly; grid and row images stay lazy.
- [ ] A failed cover still falls back to the sleeve, as today.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The thumbnail endpoint and the media store.

## Observed

- `/tmp/opencode/critique-a-library-phone.png`: the "Eau" card is a solid black square where the sleeve hue belongs.
- `/tmp/opencode/critique-a-detail-desktop.png`: the hero is an empty grey square on arrival.

## Expected

- Artwork arrives on the playlist's own colour, and the hero is not deferred.

## Evidence

- `apps/web/src/shared/components/PlaylistHeader/PlaylistTileHeader.tsx` and `PlaylistCardHeader.tsx` (`loading="lazy"`).
- `apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.module.scss:632-650,1000-1015`.
- `docs/DESIGN.md` ("Images that repeat lazy-load").
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2.
