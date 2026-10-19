# 88: Quiet the gallery's filled play

**State:** `needs-triage`
**Category:** `enhancement`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** enhancement
**Summary:** Every gallery tile and card fills its play control with the accent, so the library shows six to seven identical filled actions beside a filled CTA on the web and a filled floating action on the phone, against a brief of "calm, content-first, quiet" and a design record that reserves the fill for the one action of the screen.

**Current behavior:**
`PlaylistTileHeader` and `PlaylistCardHeader` place `primaryControl` on the cover with the shared `__play` treatment, which is `background: var(--accent)`. The library's header CTA and the phone's `FloatingAction` are also filled. The maintainer chose the quieter gallery during triage.

**Desired behavior:**
The gallery's per-item play is quiet: visible but not filled, and it gains the fill on hover, focus or when its playlist is the one playing. The filled play stays on the detail hero and in the player bar.

**Key interfaces:**

- The playing tile already carries `data-state`, so the fill can key off it.
- The empty gallery's single CTA and the detail hero keep their fills.

**Acceptance criteria:**

- [ ] At rest the library's tiles do not present filled accent controls.
- [ ] The playing playlist's play is still distinguishable.
- [ ] Hover, focus and touch all leave the play reachable.
- [ ] `docs/DESIGN.md`'s accent rule is amended to record the change.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The player bar, the detail hero and the switch, which keep the accent by decision.

## Observed

- At 390 the library draws seven filled green play circles plus the filled floating action.

## Expected

- The library reads quiet; the accent marks one action, not six.

## Evidence

- `apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.module.scss:374-400`.
- `apps/web/src/views/library/LibraryPage/LibraryPage.module.scss` (`__add`).
- `docs/DESIGN.md` (accent).
- Impeccable critique of `apps/web`, 2026-10-19, priority issue P2; maintainer's triage answer, 2026-10-19.
