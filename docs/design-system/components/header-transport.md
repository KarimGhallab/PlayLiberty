# The transport on the playing header

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

Skip back and track next, either side of the play, in a row above the shuffle and the overflow, and
**only while something is playing**. Both glyphs are already in the pin, so this is a second consumer
rather than a new icon, and `player-track-next` carries the pin's own optical correction while
`player-skip-back` is centred in its box.

**The steps are quiet, and the reason is hierarchy rather than taste.** The play is the only door, and a
bordered step beside a filled play reads as two more buttons competing with it; an unbordered one reads as
the ends of the control it belongs to. The cost is that each step is now 16px of muted glyph with nothing
drawn around it, so nothing marks where it is until the pointer arrives.

**Which is why the target is not the box.** `--control-touch` is 44px, the visible box is 32px, and
anything tappable on mobile sits inside a 44px target, the way the checkbox row puts
`--control-size-check` inside `--control-touch`. A bordered control can be wrapped in a larger invisible
box; a borderless one has nothing to wrap, so the box grows outward instead, six pixels a side, by a
`::before` that paints nothing. Six is not arbitrary: the gap is `--space-3` at 12px, so the two targets
meet exactly in the middle of the gap and neither eats any of the other's. At the 8px gap this started
with, 12px of target grew into 8px of space, which is 4px of contested area where one control quietly
takes the pointer from its neighbour.

**Every layout costs horizontally, because the header is 136px tall in all of them.** The cover and the
body both set its height, so the height a one-row actions block gives back goes nowhere. What differs is
the actions column, and since the body is the only flexible column, all of it comes out of the title: a
transport row of 32px steps costs 64px of actions and leaves the title 750px, one row of five costs 208px
and leaves 670px, and three equal 48px boxes cost 160px and leave 718px.

**Those three figures are 1056px figures, and this record did not say so until the playlist detail screen
measured the header at 390.** They are the only numbers here that carry a width's absence: "leaves the
title 750px" is true of a 1056px header and of nothing else, and a reader arriving at the second
consumer of this header had no way to tell which. The sibling records name both widths explicitly, so
the omission was this one's alone. It is closed, and the phone's measurement is beside it rather than in
another file:

|                          | at 1056           | at 390                                        |
| ------------------------ | ----------------- | --------------------------------------------- |
| the header's height      | 136px             | **136px**, 136.6 with the sync line's time on |
| the actions column       | 72px              | 72px, and **136px** while playing             |
| the identity block       | 848px             | **180.4px**                                   |
| the drawn title's column | 750px / 670 / 718 | **152.4px**                                   |
| the cover                | 96px              | 96px                                          |

The phone's row is 180.4px because 96 + 20 + 180.4 + 20 + 72 = 388.4, and 136px because the body's
content fits inside the cover's 96. Two things follow that are this record's business rather than the
screen's. **The transport costs the phone 64px of the identity block while it is playing**, 180.4 to
116.4, because `.actions` is a column and the steps go above the action row rather than beside it, which
is the arrangement this record already asks for; that is the tightest width anywhere on that screen. And
**the identity block is 180.4px against a sync line that needs 198.16px**, so the line cannot hold a
separator and a time at that width, and the separator is what should go rather than the time's own span
wrapping inside itself. Both are recorded where they are decided, in
[the playlist detail's record](../screens/playlist-detail.md).

The arrangement that puts the transport under the identity block is the one worth drawing, because its
cost is not where it looks. Nothing moves on the right and the transport costs no margin at all; it costs
the title column 67%, down to 267px, because the name, the count and the transport end up sharing one
line and the cover stops being the name's neighbour. Three equal 48px boxes is the only option that
answers a documented problem, since the `.icon-btn` rule already says 32px is too small for a thumb, and
it is not used because at 48px a step is 0.92 of the play and filling the middle is then the only thing
saying which of the three is the door.

**The transport is absent when paused, not disabled.** A paused playlist has no previous and no next to
go to, and a control that appears and cannot be pressed is the fault check `2p` exists to catch in the
track row.
