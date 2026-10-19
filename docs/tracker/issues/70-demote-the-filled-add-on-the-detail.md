# 70: Demote the filled add on the playlist detail

**State:** `ready-for-agent`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** On the playlist detail the accent fills both the hero play and the "Add a track" button, so the screen has two primaries and the add is the louder of them. The decision taken on 2026-10-16 keeps the detail's other accent uses and demotes this one.

**Current behavior:**
`PlaylistDetailPage.tsx:397-407` draws "Add a track" with `.playlistDetail__add` (`PlaylistDetailPage.module.scss:56-79`), a filled `--accent` button, on the same screen as the 48px accent hero play, the ON skip switch, the selected filter chip, the sort's open rule, the seeker and the volume fill. `docs/DESIGN.md:22` says the accent "is spent once per screen: the play control", so the detail already contradicts it several times over.

The decision of 2026-10-16 is that the multiple accent uses on the detail are deliberate and stay, and that the filled add is the one exception: it is on the quiet side of the line and is the loudest element on a screen briefed as calm and content-first.

**Desired behavior:**
"Add a track" reads as a secondary control, drawn with a surface or a control border, so the screen keeps exactly one filled accent and it is the hero play.

**Key interfaces:**

- The detail's action row keeps its back link and its add control; only the add's treatment changes.
- The add keeps its `IconPlus`, its label and its focus ring.
- `docs/DESIGN.md`'s accent rule is either satisfied or amended to record the decision for the rest of the screen.

**Acceptance criteria:**

- [ ] The detail draws exactly one filled accent control, the hero play.
- [ ] The add keeps its label, its icon, the focus ring and the touch target.
- [ ] `docs/DESIGN.md`'s accent rule and the detail's rendering agree, the rule amended if the decision is to be recorded rather than the screen quietened.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The switch, the selected chip, the sort's open rule, the seeker and the volume fill, which the same decision keeps in the accent.
- The library's filled "Add a playlist", which the decision did not cover.

## Observed

- The detail draws a filled accent add beside a filled accent hero play on one screen.
- `docs/DESIGN.md:22` reserves the accent for the play control once per screen.
- The add is the visually loudest element on the screen.

## Expected

- One filled accent per detail screen, and the play holds it.

## Evidence

- `apps/web/src/views/playlist-detail/PlaylistDetailPage/PlaylistDetailPage.tsx:397-407`; `PlaylistDetailPage.module.scss:56-79`.
- `docs/DESIGN.md:22`.
- Impeccable critique of `apps/web`, 2026-10-16; the design-intent answer recorded on the same date.
