# 72: The phone gallery card truncates the playlist name

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** At 390 the library card is about 160px wide and its name row holds the name, the share mark and the incomplete badge, so a seven-character name renders "Etoi..." and the full name is only in `title`, which touch cannot reach.

**Current behavior:**
`LibraryPage.module.scss` sets the phone grid to `minmax(160px, 1fr)`. `usePlaylistHeader.tsx` puts the share mark and `nameMark` in the same `__name` row as the name link. On the card (`PlaylistCardHeader`, `item`), that badge is the library's `IncompleteBadge`, which is wide. The detector reports `playlist-header__name-text` overflowing its box by 22px at 390.

**Desired behavior:**
A normal playlist name reads in full at 390. The incomplete badge stops competing with the name; it already lives in the actions row on the desktop tile, so the card can move it to the meta line next to the count.

**Key interfaces:**

- `PlaylistHeaderSeam.mark` stays the seam's input; this is where the card places it.
- The tile and the row arrangements keep their current placement.

**Acceptance criteria:**

- [ ] At 390 a playlist whose name is up to 20 characters is not clipped by the mark or the lock.
- [ ] A playlist with failures still shows its incomplete count on the card.
- [ ] The name stays the heading or link it is today.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The sleeve hues, the cover pipeline and the desktop tile.
- The detail header's name, which is short by construction.

## Observed

- "Etoiles" renders "Etoi..." at 390 with a failed-count badge present.

## Expected

- The name is readable, and the badge does not set the name's width.

## Evidence

- `apps/web/src/views/library/LibraryPage/LibraryPage.module.scss` (phone grid).
- `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx` (name row).
- `/tmp/opencode/critique-a-library-phone.png`; detector `name-text` overflow 22px at 390.
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P1.
