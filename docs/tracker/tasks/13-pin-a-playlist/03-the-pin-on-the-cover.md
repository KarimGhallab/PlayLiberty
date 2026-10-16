# 03: The pin on the cover

**Blocked by:** [`02`](02-the-pinned-section-and-the-menu-item.md).
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## Objective

The item carries a pin in the top-right corner of its cover: out of the way until it is reached for, always
there where there is no pointer to reach with, and saying at rest whether the playlist is pinned. It is the
same action as the menu item and not a second one.

## Context

Read [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md), and the library record's section on the pinned
section and the pin on the cover, which is where the drawing and its reasons live.

The share indicator's tooltip is the closest thing in the item and it is not the model: its panel is hidden at
rest behind a mark that never hides, and a control cannot be hidden that way, because a hidden element takes no
focus and the reveal would lose its keyboard half and leave the control reachable by pointer alone. The shuffle
toggle is the model for the semantics: a pressed state with a stable name.

## Scope

- **The control sits in the cover's top-right corner**, in the item's own quiet box and at the touch target the
  record owes where it owes one, inset from the corner, on the ground the cover puts under a mark, toned as the
  record decides for each state.
- **Hidden at rest and still focusable.** Visually hidden with pointer events declined, revealed by hovering the
  item and by the control's own focus, taking the accent ring every control takes. A pinned item's control is
  visible at rest, because the state is what the glyph is for.
- **Wherever hover does not exist it is always visible**, expressed as the query for a device without hover
  rather than as a width.
- **It does not swallow the press that opens the playlist** while it is hidden: the cover keeps its own press,
  and no invisible target sits over the artwork.
- **It is a toggle.** Its pressed state is the pin; its accessible name names the action and the playlist so
  forty of them are distinguishable; the glyph at rest is the state and the glyph under the pointer is the
  action. No tooltip, and so no dismissal.
- **It consumes the same action as the menu item** rather than writing its own.

## Out of scope

The menu item and the section, which are `02`. The specimen, the glyph geometry and the pinned set, which are
`04`. The browser journey, which is `05`. Where the control sits on the card arrangement.

## Verification

- `pnpm test:unit`, `pnpm run build`, `pnpm run lint` and prettier pass.
- The item's tests prove: the control is present on every item and names the action and the playlist; it
  reports its pressed state; a press pins and a second press unpins; it is revealed by focus; the cover's own
  press still opens the playlist while the control is hidden; and an axe pass is clean.
