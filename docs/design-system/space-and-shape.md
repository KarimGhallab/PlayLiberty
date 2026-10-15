# Space, shape and depth

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

Nine steps in three bands. A spacing scale exists to create grouping, not to fill space; distance is the
only hierarchy cue that costs nothing.

| Band      | Steps                                                          | For                                                |
| --------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Tight     | `--space-1` 4, `--space-2` 8                                   | inside a control, icon to label                    |
| Working   | `--space-3` 12, `--space-4` 16, `--space-5` 20                 | where a list lives, so most of the app is set here |
| Breathing | `--space-6` 24, `--space-7` 32, `--space-8` 40, `--space-9` 48 | letting a block stand alone, rare on purpose       |

Repeated rows use fixed-width slots for the state indicator, the trailing action and the duration, so
the lanes line up regardless of content. A gap alone does not align anything.

`--radius-artwork` 4px for album art, square and barely softened so a grid of covers reads as one
surface. `--radius-control` 6px for buttons and inputs. `--radius-card` 10px for cards, the player bar
and the empty state. `--radius-chip` 999px is the full round rather than a corner, and it is a circle
wherever the object is one: a spinner, a knob, the play button, the 7px state dot. It draws a pill on a
switch track, the filter chips and the library's not-stored mark, and none of those borrow it to soften a
control's corners.

Depth comes from the surface step and the hairline, never from a shadow. No glow, no glassmorphism, no
drop shadow heavier than a subtle lift on the player bar.
