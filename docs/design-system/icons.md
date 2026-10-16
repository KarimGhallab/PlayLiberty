# Icons

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

Glyphs come from Tabler, MIT, and the decision is recorded in
[the design record](../DESIGN.md#icons-come-from-tabler-pinned-to-one-version). The web client draws them with
`@tabler/icons-react` and the mobile client with `@tabler-icons-react-native`, pinned to the same
version, so both draw the same artwork from the same package rather than each carrying its own geometry.
Tabler is a 24 unit grid with a 2 unit stroke.

**A control that centres an icon declares its padding.** A `<button>` carries a user-agent padding of 1px
vertical and 6px horizontal, and `place-items: center` centres within the _content_ box, which is
therefore smaller than the control. A 16px icon in a 28px control whose content box is 14.4px overflows
and lands 0.8px right of centre, which reads as almost centred and is worse than a visible error, and a
screenshot does not show it. The rule is `padding: 0` on any button that sizes itself and centres its
content, and it is check `2h`.

**No mark is typed.** Not a character, not a numeric character reference, in any specimen or in the
product. A typed glyph is drawn by whatever font happens to be installed, so it lands at a different size
and on a different baseline in every family that is not the one it was measured in, and this ships as a
package that loads alongside whatever fonts a user has. It is check `2g`.

**A glyph takes the colour it sits in.** `currentColor` on the web, the inherited colour on mobile, and
never a colour of its own. This is not only tidiness: the do's and don'ts reserve saturated colour for
album art, and an icon with a baked-in colour is a second palette competing with the first. It also means
an icon inside a disabled control, a muted label, or a filled accent button needs no rule of its own,
because it has already inherited the right one.

**The pin held `minus` for a long time without `plus`, which is the shape of an omission rather than
a decision.** Nothing in the tree drew an add control with a mark on it until
[the library's record](screens/library.md) did, and a pair that obviously belongs together arriving one half
at a time is worth recording so the next reader does not read the absence as a choice against the plus.
`plus` is the minus's other stroke: two paths, `M12 5l0 14` and `M5 12l14 0`, the second of which is
byte-identical to the `minus` already in the pin, so the two are certainly from the same package and
the same version. It is 0.667 of both axes and centred, which is to say it takes no optical correction:
a cross is symmetric about the middle of its own box, and the one figure that says otherwise, 0.01 of a
unit, is raster noise. It is drawn at `--icon-sm` beside a `--text-sm` label, because at `--icon-md` its
ink would be 1.36 times the cap height of the word next to it and at `--icon-sm` it is 1.09.

**The pin and the unpinning are the library item's one toggle, and the pair is the action rather than the
state.** `pin` is the pinning and `pinned-off` is the unpinning, drawn as the pin crossed out, because the
menu item's word is the action and the drawing may not contradict it: the item reads `Pin` while the playlist
is unpinned and `Unpin` while it is pinned, and the glyph flips with the word. Neither carries an optical
correction, and both absences are the assertion. `pin` is a diagonal whose ink centre lands a quarter of a unit
right and a quarter up of the middle of the 24 unit grid, which is 0.17px at `--icon-sm` and under the
correction's own threshold, the same absence the checkbox tick and the chevron take; `pinned-off` is the pin
under a slash that spans the whole box, so it is centred to nothing. Both are drawn at `--icon-sm` beside a
`--text-sm` label, because a menu item is a mark on a label rather than a peer of it, the pair the two marks
on a button already use. Verbatim from `@tabler/icons` 3.48.0 `icons/outline/pin.svg` and
`icons/outline/pinned-off.svg`.

**The chevron is in the pin for one control, and it is the fourth thing a route needs and only the
second screen has ever drawn.** `chevron-left`, one path, `M15 6l-6 6l6 6`, verbatim from
`@tabler/icons` 3.48.0 `icons/outline/chevron-left.svg`. It is the way home off
[the playlist detail](screens/playlist-detail.md), which is a web fact: on mobile the platform
gesture returns from a pushed route, so a control that returns would be a second way to do what the
platform already does. A word alone reads as a section heading rather than as
a control, and a chevron alone is a shape with a name attached to it, so the way home carries both.

**It takes no optical correction, and that is a measurement rather than an omission.** Its ink spans
x 9 to x 15 and y 6 to y 18, so it centres at 12 on both axes of the 24 unit grid. There is no
`PINNED_OPTICAL` entry for it below and the absence is the assertion, because the validator fails a
glyph that is already centred and carries a correction anyway. A chevron's _perceived_ centre is a
shape further right than its ink, which is the argument the two left-alone glyphs make below, and it
lands on the same answer: a third of a unit at `--icon-sm` is 0.21px, which is a number in a stylesheet
that changes nothing on screen.

**The two marks this system puts on a button are the heaviest and the lightest glyphs it owns, and
`--icon-sm` is what keeps that from reading.** `rotate-clockwise` is 18 by 18.06 units of the 24 unit
grid, **75%** of its box, and the `plus` is 16.08 units, **67%**, so the two marks that appear beside a
label are both round and both far above the family's spread. Measured against a `--text-sm` cap height of
10.0px: the rotate at `--icon-sm` is 12.04px of ink, **1.20 times** the cap height, and at `--icon-md` it
would be 15.05px, **1.51 times**, where the plus at `--icon-md` is 1.36. So the mark is a mark _on_ the
label and not a peer of it, and the step below `--icon-md` matters more for these two than it does for
anything else in the set. Both are centred to 0.00 units on both axes, so neither carries a correction
and the validator's rule that a centred glyph must not carry one is what holds them there.

**The rotate is in the pin twice under two names, and the two are the same shape.** `i-rotate-clockwise`
in [the icons specimen](../design/foundations/icons.html) and `i-rotate` in
[the playlist header's](components/playlist-header.md) carry byte-identical paths and the same
`data-icon` at `@tabler/icons` 3.48.0. That is not a duplicate to tidy: one is the mark on a `Sync now`
button and the other is the mark on a `Sync now` menu item, and they are the same verb so they are the
same glyph. A screen that composes both reads one symbol out of the other rather than typing the path, so
the two cannot drift apart.

**Outline by default, filled only where filled means something.** This system uses filled in two places,
both on the primary play button. The play triangle is filled because a solid triangle is the convention
every platform already expects. The pause bars are filled too, and that is not a matter of taste: the two
are the ends of one transition, and a transition from a solid triangle to a hollow pair of bars reads as
the glyph losing weight halfway through rather than as the shape changing. The endpoints have to agree
about ink or the middle is doing two jobs. Measured on the pinned set, the filled play is 26.8% of its
box and the filled pause 32.2%, a difference of 5.4 points, while the outline pause sits far below the
filled play. Everywhere else an outline keeps a row of secondary actions from reading as a row of badges.

**One weight, which here means the choice between outline and filled.** Tabler has no duotone and no
six step weight axis, so there is nothing to map onto the 400, 500 and 600 type weights and no decision
to record about which icon weight pairs with which text weight.

**Size comes from a token, and there are three steps.** `--icon-sm` 16px is a mark inside a control, the
tick in a checkbox. `--icon-md` 20px is a glyph in an icon-only control. `--icon-lg` 28px is the primary
play button and nothing else. The two larger steps are set by a ratio to the control rather than by a
number: 20 is 0.62 of the 32px control and 28 is 0.58 of the 48px one, so both sit at a single ratio of
about 0.6 and a pair of buttons reads as a pair. `--icon-sm` is the exception at 0.89 of the 18px
checkbox, because a mark inside a control is filling the control it belongs to rather than sitting in
one.

Those steps were measured in the controls rather than read off the 24 unit grid, and the grid is
genuinely no help. A glyph does not fill its box: across the twenty in this system the drawn width runs
from 0.17 of the box on the three dots to 0.93 on the cloud, a factor of five and a half, so a scale taken
from the grid would have put all of them at one optical size when they are at four.
`docs/design/foundations/icons.html` carries the measurement.

**Six glyphs are not centred on their own box, four of them are moved and two are not.** Tabler centres
the filled play triangle on its optical bounds rather than on its box, which is right for a glyph
standing alone and wrong for one in a round button: it sits 1.5 of 24 units right of centre, which is
1.75px at `--icon-lg` and reads as a triangle pushed to the right of the circle. It is nudged back, as a
position and not a size, so the glyph is still drawn at the token size and the two clients still agree on
one number per step.

The correction is attached to the reference and to nothing else. It is a property of the artwork, so it
is keyed to the artwork: play and pause carry identical markup and differ only in which glyph they
reference, so a correction on the element around the icon would centre the triangle and push the pause
bars 1.75px left of the middle of their own button. The validator holds both directions of that, that a
glyph which needs a correction must carry it and a glyph already centred must not.

The two left alone are the checkbox tick at half a unit, which is 0.33px inside an 18px box, and the
pencil at a third of a unit, which is 0.21px at `--icon-sm`. Both are below where a correction would show,
so a correction there would be a number in a stylesheet that changes nothing on screen.

An icon is never the accessible name of a control. An icon-only control carries a label, because the
glyph is the affordance and the name is what a screen reader has to announce.

**One shape in the system is computed, and the pin still holds its two ends.** The frames between play
and pause are not in the pinned set, because nobody drew them. The morph is eight frames over
`--motion-base`, derived by `docs/design/scripts/morph-frames.mjs` from the two pinned glyphs' own path
data, and the design check re-derives the table on every run and fails if the specimen's copy is not
what comes out, so no frame is ever typed. A control at rest is a pinned glyph, character for character.
The three things a morph can get wrong that a static glyph cannot are each a rule: the gap between the
two halves opens and never closes past zero, the ink area does not sag more than 3% below where it
started, and the centre travels no more than half a unit of the 24 unit grid. The area rule is a ceiling
rather than a demand for a straight line, because the area of an interpolated polygon is quadratic in
the parameter and sags before it climbs, and a straight-line rule would let through a 35% pinch. A
bounding box is not a check on any of this: a real fault had a box within 0.05 units of correct, because
the straight edges set the box and the corners do not touch it.
