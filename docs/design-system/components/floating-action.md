# The floating action

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

One round button on the frame's bottom-right corner, drawn at the phone width and by neither screen above it.
It is one component because it is one control at two consumers: the library uses it to add a playlist and the
playlist detail to add a track, and the two differ in the accessible name and in nothing else.

## The button

|                     | value                                          |
| ------------------- | ---------------------------------------------- |
| box                 | 56 by 56px, a circle (`--radius-chip`)         |
| inset               | `--space-4` from the frame's right and bottom  |
| with the bar docked | 113px up, clearing the 97px bar by 16          |
| fill                | `--accent`, `--accent-hover` under the pointer |
| glyph               | `plus`, `--icon-lg` 28px, 50% of the box       |
| tier                | `--z-sticky`                                   |
| visible word        | none; the name is on `aria-label`              |

The glyph is `--icon-lg` because the box carries no word for it to sit beside: at `--icon-sm` the plus is 29%
of a 56px box and at `--icon-md` 36%, and an extended pill carrying "Add" measured 98 by 56px, which is
**56.9% of a card's width** on the phone it would sit on. There is no shadow token in this system, so the
button is `--accent` on `--bg`, the 5.85:1 the add button's legend already had, and its hover is the
`--accent-hover` step every accent control takes.

`--z-sticky` is above the grid and the list, below the 97px player bar at `--z-player`, and below the
overlays at `--z-overlay`, because a dialog is what this control opens. The bar is an overlay rather than a
sibling, so the button reads the queue for the bar's presence and moves up when it is there: the page cannot
answer that question for it, and a button behind the bar is a button nobody has.

## The room it needs

A fixed control does not scroll, so each page pays for it in its own bottom padding: the last card or track
row must be able to scroll clear of the corner it holds. It is **88px** at rest, which is the 56px box and
`--space-4` either side of it, and **185px** with the bar, because the bar is 97px and the button clears it by 16. On the library that is 23.8% of the content area paid in scroll, which is the price of a control that
stays where the thumb is.

## Where each screen draws it

- The **library**: for any account with at least one playlist, and never on the empty gallery, whose own
  action is a framed button in the middle of the screen. A floating copy there would put the action twice on
  the one screen where a person has seen neither.
- The **playlist detail**: for the owner and a `write` collaborator, and never for a `read` one, which is the
  same rule the overflow follows. The screen's labelled control moves into the way-home row above the phone
  breakpoint and becomes this button at it and below, so one of the two is drawn at a time.

Both screens gain the height the labelled control was spending: the library's header is **56px** at the phone
width rather than 68.8px, which is the title and the language control alone.
