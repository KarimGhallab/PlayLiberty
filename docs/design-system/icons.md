# Icons

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

Glyphs come from Tabler, MIT, and the decision is recorded in
[`docs/adr/0010-tabler-icons.md`](../adr/0010-tabler-icons.md). The web client draws them with
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
genuinely no help. A glyph does not fill its box: across the nineteen in this system the drawn width runs
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
