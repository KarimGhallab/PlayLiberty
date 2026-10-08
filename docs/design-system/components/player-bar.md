# The player bar

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The one component whose height is paid for by the thing it covers. It is anchored to the bottom on both
surfaces, so every pixel of it is a pixel of track list the user cannot see, and it is the only place in
the product where a control has to be worth a second row.

**Two rows: the thumbnail, the title and the player actions on the first, the durations and the seeker
on the second.** The transport sits on the bar's centre on the first row, and the seeker is capped at
480px and centred on the second with the two times against its ends. 98px tall.

The centring is a three-column grid of `1fr auto 1fr`, and that is the only honest way to do it in a
single flex row: centring means either equal widths either side, which is what the two `1fr` columns are,
or an absolute offset, which is not. **The chosen arrangement is the only one whose transport posts 0px
of offset.** What looks like a centred transport in a flex row is the identity and the transport being
centred together: a one-row variant that is exactly that had its transport 16px left of the middle with
390px of empty bar beyond its shuffle, and it read as centred because the title it was measured with is
391px of a 981px bar. A number in a sentence does not notice that.

**The costs are all horizontal, and all of them were measured after layout rather than argued.** The
shortest arrangement is 74px, 8.2% of a 900px screen, so the 24px above the floor is what a second row
plus a centred transport cost together. Three rows and a centred transport reach 146px, 16.2%, leaving
263px of title at 390. Centring costs title room, and it is worth saying what at
which width because the paragraph it sits in claims two widths at once: at 1056
the flush arrangement gives the title 818.4px and the centred one 375.2px, so the
centre costs 443.2px, and the drawn 339px title shows whole in both. The tape
has to be told the drawn width of a title separately from the room it has: all three arrangements draw
the same 339px of name and only two of them show it whole. A title measured by its box looks identical in
the one that truncates and the one that does not.

**The cap is 480px because of arithmetic rather than taste.** Uncapped the seeker is 899px of the 982px
content box, and a four minute track moves its playhead 3.7px per second, so one pixel of pointer is a
quarter of a second of music. At 480px it is 2px per second. Capping also puts the elapsed time next to
the playhead rather than most of the way across the bar from it. The cost is 419px of track, and that is
a real loss of width bought with an argument about the pointer.

**At 390 the centre and the cap are both dropped, and that is one decision rather than two.** The cap has
to go because 480px does not fit 348px, and it went overflowing 124px past the bar's edge; it goes to
`flex` rather than to a smaller literal, because a 44px cap is not a cap. The centre has to go because a
symmetric bar needs room for two halves and 390 leaves 314px of content, which gave the title 21px. So
the row becomes `1fr auto`, the transport lands on the right edge 89px off centre, and the shuffle goes
because the header already carries it. **The two arrangements then converge**: the flush one is the
centred one minus the centre and minus the cap, and every measurement of the two is identical, 98px and
111px of title room and nothing past the edge.

The width at which the two swap is a decision about how much title room is worth having rather than a
number anything can derive. 306px is where the centred form stops fitting at all, and 348px fits it while
giving the title 21px, and somewhere between those two is a judgement. So the client picks by available
width and no figure is written into the token set for it.

**The centred arrangement is the base and the phone's is the class, because getting that backwards put a
phone's bar on a desktop.** The two are the same markup; the phone's is the centred one plus `bar--flush`,
and that is how this file parameterises them. Lifting it the other way round takes the
390 drawing because that is the one the library screen wants, on the assumption that a lift is a
lift, and the playlist detail reuses the copy in a 1056px web frame and gets a bar with the transport
443.2px off centre on the right edge, the shuffle at `display: none` and so no shuffle at all, and the
seeker uncapped at 956.17px where the argument above says 480px or the playhead runs at 3.7px a second. Each
of those is a claim this file makes failing on one screen while holding on its own, which is the shape a
lift should be assumed to be wrong in. A consumer now takes the base and adds the class, and the detail's
generator asserts it carries no variant at all, so the mistake fails the build instead of rendering.

Two consumers, two widths: the detail docks a 1056px bar and takes the base, and the library docks a
388.4px one and asks for the flush arrangement, which is unchanged by any of this.

**The bar takes no shadow, and that is a departure from the line above.** Depth allows the player bar one
subtle lift. On a dark theme a lift is not available: a shadow is dark, the page is dark, and a dark blur
over a dark page is invisible rather than subtle. The lift that does work in a dark theme is a lighter
edge, and `--line` already is one, so the bar's boundary is `--line` and the allowance is not taken. The
same reasoning one size down puts a 2px `--surface-raised` ring between the seek knob and the accent
fill, because `--ink` straight onto `--accent` is the pairing this system forbids at 2.73:1 and the ring
puts the knob back on a surface that measures 13.42:1.

**The fill is scaled, not resized.** The progress is a full-width accent block carrying
`transform: scaleX(fraction)` from `transform-origin: left center`, and the stylesheet transitions `transform`.
A `width` transition would lay the bar out on every frame, and the bar is mounted across the app; the scale
keeps the movement on the compositor and the drawn progress is the same. `border-radius: inherit` keeps the
track's pill, and the leading cap sits under the knob, so the one radius the scale softens is covered.

**`data-state` is on the bar and it drives two things and not a third.** The artwork's equalizer strip and
the morph's resting frame read it. The transport does not, and that is where the bar differs from the
header: the header's steps are absent unless the playlist is playing, because a paused playlist has no
previous or next to go to, while the bar's are always there, because the bar is the one place a user goes
looking for them and a control that appears and disappears in the one place they look is worse than one
that is always present.

**The identity is one line, and the reason is the schema rather than restraint.** `TrackSchema` carries
`title`, `durationSeconds`, `thumbnailPath`, `fileStatus`, `sourceStatus` and `failureReason`. There is
no artist and no album, so the second line every player bar spends on the artist has nothing to put in
it here, and the only thing that would ever occupy it is a state word, which the resting state does not
have by the system's own rule. The line is available and empty.

**The artwork is 40px, and it could not be anything else.** The strip's bar count solves `7n - 4` against
the artwork's content box, so the only two sizes a whole number of bars fills exactly are the 96px cover
and the 40px thumbnail, and a strip that stops short of the artwork's edge is the fault that arithmetic
exists to catch. Taking the track row's size also means the bar's strip and the row's are one table
rather than two. That rule is restated in each specimen rather than shared, because `.art` is not a class
in `specimen.css`, and a file that used the name without declaring it drew its strip across the whole
bar: `.bars` is absolutely positioned with `inset-inline: 0`, so with no positioned ancestor it
resolved against the bar instead of the artwork, and every number being checked was about the strip's
own geometry rather than about where the strip was.

**The bar is absent at rest.** The
[library](../screens/library.md) is the route a person arrives at before they have chosen anything,
and it is the one place where a bar holding nothing costs the most: 98px of a phone's landing screen
spent on a play that cannot act. So the bar appears on the first track and is absent before it.

**The persistence argument survives for the rest of the product and is scoped rather than deleted.** A
person who has opened a playlist is somewhere they chose to be, and the bar being there is what they
expect. So the bar is persistent once playback exists, and the rule is now about the bar's lifetime
relative to playback rather than relative to the route.

**What the arrival costs is measured, because withdrawing an answer is only half of it.** At 390 the
library's content area goes from 788px to 691px. That figure has been re-measured four times on this
screen and each time the unit changed: at 775 to 678 it took a whole 88.8px row down to seven, and when
the library's items became the playlist header it took 0.23 of a 436.8px card, and when the mobile list
became a two-column grid of 172.2px cards it took **two of the six cards** above the fold, and the
header losing its add button to a floating one moved the area by 12px. The bar has
not changed; the thing it is being measured against has, three times, which is why the figure here is
the one from the drawing rather than the one from the argument. The bar still takes real room on the one
screen where a person is about to tap a play, which is the price of not drawing it at rest.

**A docked bar is 97px rather than 98**, because its bottom border is against the screen edge where a
border draws nothing. The 98 in this file is the bar as a block in a specimen page, which has an edge
all the way round.

**A bar that is present but has nothing to play does not exist any more**, so no `disabled` play is drawn
for that state. Check `2p`'s reason for preferring `disabled` to
merely inert still stands for the controls that are genuinely unavailable rather than absent: a bar
whose track has no file on disk, or a queue that is empty while playback is stopped. The distinction is
between a control that cannot act and a bar that has not arrived, and only the first wants a disabled
control sitting there explaining itself.
