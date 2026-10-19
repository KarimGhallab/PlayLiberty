# 70: Demote the filled add on the playlist detail

**State:** `resolved`
**Category:** `enhancement`

## Outcome

`PlaylistDetailPage.module.scss`'s `__add` now draws "Add a track" with the same secondary treatment as the other border controls: an ink label on a transparent ground, a `--control-border` edge and a `--surface` hover. The label, the `IconPlus`, the control height and the global focus ring are unchanged, and `PlaylistDetailPage.tsx` is untouched. The 48px hero play is the detail's one filled primary control in its two-column arrangement.

`docs/DESIGN.md`'s accent rule is amended rather than the screen quietened: it now records that the detail keeps the switch's on position, the selected chip, the sort's open rule, the seeker and the volume fill in the accent by decision, and that the labelled add takes the border instead. The rule also notes the phone's floating add, which stays filled because it replaces the labelled add at that width; that component is shared with the library, which the decision did not cover.

No test was added. The unit suite runs in jsdom without the stylesheets, so a test can only restate the class name, not hold the treatment; the existing add tests still cover the control's behaviour. Verification: `pnpm run build` clean, `pnpm run lint` clean, the unit suites pass (web 484 tests / 48 files).
