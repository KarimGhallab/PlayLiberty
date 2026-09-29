# The playlist detail

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

`/playlists/:id` on web, pushed over the library root on mobile. The screen the product exists for: the
only place stored tracks become audible. It composes the playlist header, the track row, the sync
summary, the sync error, the empty state and the player bar, and its own work is to arrange them, gate
three controls on access, and cover the states a playlist can be in.

**Two arrangements, and this record names them and keeps them apart.** Web is two columns inside a frame
of a stated size. Mobile is a single column pushed over the root: the header on top, the rows under it.
Both are drawn. Every measurement below is attributed to a width, and the two differ in the column count,
in the height budget, in whether a way home exists at all, and in what the user can reach.

## The two arrangements, and which of each fact belongs to which

|                         | web, at 1056 x 900                      | mobile, at 390 x 844                    |
| ----------------------- | --------------------------------------- | --------------------------------------- |
| drawn                   | yes                                     | yes                                     |
| columns                 | two, 320px and 712px with a 24px gutter | one                                     |
| the playlist's identity | the header's card, 320px, a 288px cover | the header's row, 388.4px, a 96px cover |
| the way home            | a chevron and the word Playlists        | none, and the reason                    |
| the player bar          | centred, 97px, drawn at rest            | flush, 97px                             |
| the height budget       | a stated viewport, 803.8px of content   | 842.4 less a header less 97             |
| a track row             | 64.8px                                  | 64.8px, and two are 76.1                |
| the three access levels | drawn, one menu open each               | drawn, one menu open each               |
| the four states         | three of four drawn                     | three of four drawn                     |

**Every figure below is attributed to the arrangement it was measured on, and the two are kept
apart.** At **web**, 1056 wide and 900 tall, the frame's content box is 1056 by 900 and the docked bar's
top is at 803.8px. At **mobile**, 390 wide and 844 tall, the docked bar is the flush arrangement at
**97px** and its top is at 745.4px. Both frames take their border inside the stated width, so the
phone's content box is 388.4 by 842.4 and the desk's is 1056 by 900.

**Four facts are web-only and one is mobile-only, and they are the ones a merged record loses.** The
way home is web: on mobile the platform gesture returns from a pushed route, so a control that returns
is a second way to do what the platform already does. The signed-out library is not this screen at all,
on either client. The height budget is a phone's on mobile and a stated viewport's here. The access
levels are drawn on both, and the reason is the same on both: a menu needs room to open into, and the
library proved two open at once would overlap.

## The mobile arrangement, at 390 and 844

**One column: the header on top, the rows under it.** Nothing is side by side and nothing is shortened
to make room for a neighbour, which is the whole difference between the two arrangements: a width on the
desk is a division and a width on a phone is the whole frame.

**The header is the component's row arrangement, and the measurement is what settled it.** The header
has two arrangements and at 390 the card is **470.4px** and the row is **136px**. On 842.4 less a 97px
bar that is **275px** of list against **609.4px**, which is **4 rows against 9** on plain rows, and the
card leaves 188.6px once the resting summary and its 20px gap have theirs, so 2. This is the phone's
version of the desk's left column and the same discipline: the component's own arrangement at the width,
nothing re-decided here.

**The header was measured from nothing, and that is the gap this arrangement existed to close.**
[header-transport.md](../components/header-transport.md) measures absolute pixels and never states the
width it measured them at. Its numbers are now attributed in place: **they are 1056px figures.** So the
phone's header is a fresh measurement, and it is reported here rather than derived: at 388.4 it is
**136px** tall with the time off the sync line and **136.6px** with it on, the cover is 96, the actions
column is 72 and the identity block is **180.4px**, and 96 + 20 + 180.4 + 20 + 72 = 388.4.

**The sync line's time is off on mobile, and the arithmetic is exact.** The line needs **198.16px**:
70.78 for the state, 3.91 for the separator, 99.47 for the time and 12.00 of gap either side of the
separator. The identity block has **180.4px**, so it is **17.76px** short. The component's own answer to
that is not to wrap the row, which is `flex-wrap: nowrap`: it is that the last span wraps inside itself,
and measured, that span arrives at **81.71px** and takes **32.4px** of height instead of 16.2, which
makes the header 136.6 and leaves the separator at the end of the line above it, so the line reads
_Up to date ·_ and then _Synced 2 days ago_. A middot with nothing after it is not a separator. **This
is the decision [the library record](library.md) already makes at 390 for the same reason**, so the two
screens agree.

**The time is not lost, except in one state, and the one state is named here rather than discovered
later.** On the resting and syncing frames it is the sync summary's stamp, 20px below the header. On the
error frame the sync error replaces the summary and carries no stamp, so "Synced 6 days ago" is on no
part of that frame. That is the whole cost of the decision.

**The header is at the full width, not inset by the page's 16px working inset, and the component's own
padding decides it.** `.hdr` declares `padding: 20px 0`, so it is written to sit at its container's
inline edges. Insetting it by 16px would override a rule the header's record owns and would take the
drawn name's column from **152.4px** to **120px**. The name is **204px** at `--text-xl` and truncates
either way, so that is 13 characters of it against 10.

**The tightest width on either arrangement is the header's while playing, and it is a consequence of the
component rather than of this screen.** `.actions` is a column, so the transport goes above the shuffle
and the overflow rather than beside them, which is the header's own arrangement for the transport. The
actions column is **136px** wide while playing against 72px at rest, so the identity block falls from
**180.4px** to **116.4px** and the drawn name's column from 152.4px to **88.4px**: 7 characters of 17,
against 13 at rest.

**The access levels narrow the header, and the read level is the one that opens it up.** The write
level's menu has one item rather than none, so the action row is still the shuffle and the overflow
button and the column is still **72px**: the overflow is a 32px box whatever is inside it. The read
level has no overflow button at all, so the action row is the shuffle alone at **32px**, the column
falls to the play's **48px**, and the identity block rises to **204.4px** with the name's column at
**176.4px**. A reader sees more of the playlist's name than its owner does.

**Seven of the fourteen rows clear the bar, and the ticket's eight was arithmetic rather than a
measurement.** The budget is 842.4 less a 136px header less a 97px bar, which is 609.4px, and eight
plain rows of 64.8px is 518.4px of it. But **two of the fourteen rows are 76.1px**, the failed and
unavailable ones, each carrying a reason line 11.3px below the sub line, and 22.6px of extra row is a
third of a row. So the list's top is at **222.4px**, the bar's top at **745.4px**, the eighth row's
bottom at **764.2px**, and the answer is seven.

**The in-flight summary costs no row, which the ticket expected it to.** It is **90.6px** against the
resting **66.4px**, so the list starts at 246.6px rather than 222.4 and the eighth row's bottom moves
from 764.2px to 788.4px. Both were already under the bar, so the answer is seven either way. The
budget is spent by the two 76.1px rows, not by anything above them.

**The error frame costs two rows.** The sync error is **180px** against the summary's 66.4px, and
113.6px is 1.75 rows, so the list starts at **336px** and **five** rows clear the bar. That frame sets
the shortest viewport that fits the arrangement with nothing scrolled off, at **433px**: 136 of header,
20 of gap, 180 of error and 97 of bar.

**Full-bleed costs 5.2px of a touch target on one control in one state, and the cost is left in place
rather than designed out.** The steps are borderless, so the header record's rule puts their 44px target
outward six pixels a side by a `::before` that paints nothing. At rest nothing overhangs, because the
actions column's last item is the bordered overflow button. While playing, the last item is a step, and
its target's right edge lands at 546.4px against the frame's 541.2px: **5.2px off the screen**, so the
effective target is 38.8px rather than 44px, and the header's `scrollWidth` is 394 against a 388 client
box. Insetting the actions column by 6px fixes it and costs 6px of the identity block on the frame that
can least afford it, taking the name's column from 88.4px to 82.4px. It is left in place because the
control is not unreachable: **the docked bar on the same frame carries its own transport with the same
44px targets**, and 38.8px clears WCAG 2.2's 24px minimum with room. Named here because a number that
only exists while a playlist is playing is the kind that is never looked at twice.

**A scan that reported every glyph on the frame as overflowing was the scan being wrong, and that is
worth recording too.** Testing "does any element's box cross the frame edge" over the frame's whole
descendant tree flags the `play__strip`'s `<g>` and `<path>` children, which report rects up to 179px
past the edge. An SVG child's `getBoundingClientRect()` is in the glyph's own scaled space and is not a
layout box; the button clips them. The check that answers the question is `scrollWidth` against
`clientWidth`, which is how the 6px above was found.

**Three collision proofs on this arrangement, all injected and asserted.** The state mark unscoped
makes every state word in every row **15px** wider, `Downloading` 71.85px to **86.85px**, and takes
one row from 76.1px to **92.3px** in all six barred frames. The row's play unscoped goes **28px to
48px**, the row 64.8px to 72.8px, and the rows clearing the bar **7 to 6**. The header's `.body` rule
unscoped makes **every** row 120.8px, all fourteen identical, and the rows clearing the bar **7 to 4**.
And the bar's arrangement is proved by removing `bar--flush`: the row becomes `93.4px 136px 93.4px`,
the transport 0px off centre, and the seeker **45.8px past the bar's right edge**, which is the cap
argument reproduced at 390.

## The columns, and the number under the left one

**The left column is 320px and the floor under it is measured, and the measured floor is 3.96px higher
than the arithmetic one.** The sync summary's band is four `1fr` cells with a `--space-3` gap, and its
widest thing is a five-figure kept count: **60.01px** at `--text-lg`, measured on a real figure. So a
column of `W` gives each cell `floor((W - 36) / 4)` and the arithmetic floor is **276.04px**. At 276px
the cell is 60px and the figure is 60.01px, so it does not fit by a hundredth of a pixel, and the first
width that does is **280px**. 320 is **40px** above that.

**The header's own meta line is the other thing in the column with a floor, and it is not the binding
one.** Measured, `Up to date`, a middot and `Synced 2 days ago` is **198.16px** in a 288px content box,
and the two other pairings on that line are shorter, so it carries **89.84px** of slack. The count is on
its own line and the band is on the surface outside the card, so neither narrows the card's 288px.

**The gutter is 24px and it is the one number on the screen that is an argument rather than a
measurement.** At `--space-4` the track list is 720px rather than 712px and nothing breaks, so the cost
of either is zero. It is `--space-6` because a gutter between two blocks of content is a different thing
from a gutter between two pieces of a table, and that is a judgement rather than a number anything can
derive. It is written here as one so that a reader who disagrees knows which one it is.

**Everything else on the screen is what is left over.** 1056 less 320 less 24 is **712px** for the
track list, and a 712px row's title column is **516px** after 196px of lanes and gaps: a 40px tile, the
28px reserved play lane, a 52px duration and a 28px action lane, and the four 12px gaps between them.

## The left column is the header's own card, and that is the argument for it

**There is no third arrangement of the header, and nothing about the component is re-decided here.** The
header has a row arrangement and a card arrangement. The left column is the second of them at **320px**
rather than the 356.4px
[library](library.md) draws the same card at, so the only thing this screen decided was a width.

**What the narrower card costs, measured against the header's own.** The cover is **288px** against the
header's own 324.4px, so the artwork is _smaller_ here than on the component's own phone, which is the
direction the width was chosen. The scrim is 80px, which is **27.8%** of a 288px picture against
**24.7%** of the header's 324.4px: the band is a fixed 80px and the picture is smaller, so a band's
share of a picture gets worse as the picture does, which is the header's own recorded reason for
knowing a cover's size before choosing one. The name's text column is **260px** after the share
indicator's 20px and the row's 8px gap, which is **22 characters** of a long name against the header's
own card's 25.

**The card is 400.4px in every state, resting and playing, and so is the 286.4px band inside it.** The
transport is 136px and the action row 76px, and they sit beside each other rather than instead of each
other, so nothing about the card's height responds to whether this playlist is the one playing. That is
the header's own swap and not this screen's: a card with a play and no steps is a card that cannot skip.

**The cover draws no equalizer strip, and that is a decision rather than an omission.** The strip's bar
count solves `7n - 4` against the artwork's content box, which is exact at 96px and 40px and gives
**34.57 bars** at this cover's 288px, and the strip's own record says a comb at that count is a texture
rather than an equalizer. Its job is to say which item is playing without a press, and on this screen
the row that is playing says it with a shape on its own 40px tile, in the list, where a reader scanning
a list looks. The third fixture row is the playing one, so both readings are on one screen.

## The way home, and what it costs

**A word and a chevron, and both are load-bearing.** The word names the destination, which is what makes
the control usable by a screen reader and legible to a reader who has never seen a back chevron. The
chevron says which direction, which is what a shelf scanned quickly needs. A word alone reads as a
section heading; a chevron alone is a shape with a name attached to it. The link measures
**76.45 x 18.9px** in a **58.9px** row.

**`chevron-left` went into the pin for this one control.** One path, `M15 6l-6 6l6 6`, verbatim from
`@tabler/icons` 3.48.0. Its ink spans x 9 to x 15 and y 6 to y 18 on the 24 unit grid, so it centres at
12 on both axes and **takes no optical correction**: there is no `PINNED_OPTICAL` entry for it, and
that absence is the assertion, because the validator fails a glyph that is already centred and carries
one anyway. A chevron's _perceived_ centre is a shape further right than its ink, which is the argument
the [icons](../icons.md) record makes for the pencil and the tick, and it lands on the same answer: a
third of a unit at `--icon-sm` is 0.21px, which is a number in a stylesheet that changes nothing.

**It costs one row of fourteen, and the first measurement of that said zero.** The bar's top is at
**803.8px** in a 900px frame. **11 whole rows** clear it with the way home and **12** do without it, the
twelfth row's bottom being at 838.1px with it and 779.2px without, so it is **34.3px** under the bar in
the first case and whole in the second.

The null result is recorded because it is the kind that goes into a document as a fact. The style was
appended and the count read in the same expression, so the fault never landed, and a null result from a
fault that did not apply is indistinguishable from a null result that did. Re-measuring with the
injected rule's own computed `display` asserted in the same call gave 12, and the difference is one row.
The rule that came out of it is the one this record uses throughout: **assert the fault is applied
before believing the number it produced.**

## The states, and which three of them are compositions

**Three of the four are compositions and none is redrawn.** Never synced is the
[empty state](../components/empty-state.md) in the list area with the card beside it unchanged. Syncing
is the header's busy form plus the
[sync summary's](../components/sync-summary.md) in-flight figure. Error is the
[sync error](../components/sync-error.md) **in place of** the summary rather than beside it: they are
different components with different jobs, the summary says what the run did and the error says what to
do about it, and a column carrying both would put the same news in the same 320px twice. The summary's
own record forbids that duplication from its side for the same reason.

**The count reads 0 on a playlist that has never synced, and that follows the header's own longer
argument rather than the shorter comment beside one of its states.** `trackCount` is a stored integer,
a stored one is never unknown, and "0 is an answer rather than a placeholder". The header's markup
still omits it, and that contradiction is
[the header's to settle](../components/playlist-header.md),
not this screen's. The play is **disabled** rather than absent in that state: a playlist with nothing in
it cannot be played, and a control that is there and cannot be pressed is a different thing from a
control that is not there.

**Both of the buttons this screen composes now carry `rotate-clockwise` at `--icon-sm`, and the glyph is
the one the overflow menu already drew on the same verb.** A `Sync now` button is **126.81px** with the
mark and **115.8px** busy, the 11.01px of change being the label's own two characters. That is the
[form controls'](../components/form-controls.md) rule: a mark is at `--icon-sm`, the busy form swaps it for
the spinner rather than carrying both, and the two are the same 16px box so the swap costs the layout
nothing. Measured here, the mark costs this screen **nothing at all**: both buttons sit in columns that
are `align-items: center` or `flex-direction: column`, so the left column still ends at **460.1px** with
the empty state and **640.1px** with the fault, and the floor is still **737.1px**. That was checked
rather than assumed, because a control that grows 24px is the kind of thing that quietly costs a row
somewhere.

**One frame has no player bar, and that is the bar's own record rather than this screen's.** "A bar
that is present but has nothing to play does not exist any more, so the `disabled` play that this file
used to specify for that state is not drawn." A bar carrying a track on a playlist that has never synced
would assert playback that the same frame's card says cannot happen, and the two would be one screen's
state contradicting itself. The other seven frames carry the bar, which is the whole point of this being
the first screen in the product where it is drawn at rest.

**The docked bar is the web arrangement, and it was a phone's bar until this pass.** The lift out of the
[player bar's](../components/player-bar.md) record had taken the 390 drawing, so every frame here carried
`bar--flush`: the transport landed on the right edge **443.2px** off the bar's centre, the shuffle came back
`display: none` and so there was no shuffle on the web at all, and the seeker ran **956.17px** wide where
that record's argument is that it is capped at 480px because uncapped a four minute track moves its playhead
3.7px a second. Each of those is a claim the component holds on its own specimen failing on one screen,
which is the shape a copied fragment should be assumed to be in. The lift now takes the centred arrangement
as its base and the library, whose bar really is 388.4px, asks for the flush one by adding the class; the
library regenerates byte-identical apart from one trimmed comment, which is what makes that a reordering
rather than a change.

Measured on the seven barred frames at 1056: the row is `427.2px 136px 427.2px`, the transport is 136px and
posts **0px** of offset, the play is on the bar's centre at **0px**, the shuffle is `flex` at **495.2px** right
of centre in a 32px box, the seeker is **480px**, the title has **375.2px** of room for the same 339px of
name it draws whole, and the bar is 97px. The fix costs **443.2px** of title room against the flush
arrangement's 818.4px, which is the component's own trade and not this screen's to reargue. Reinstating the
class returns all of it: `870.4px 136px`, 443.2px of offset, `display: none`, 956.17px.

**Every state-carrying row on this screen was checked against the track row's own specimen and matches it
exactly**: the same child order and classes inside `.sub`, the same state widths to the digit
(`Downloading` 71.85px, `Pending` 44.61px, `Failed` 33.31px, `Unavailable` 64.66px, `Removed, still here`
105.49px), the same 64.8px height, the same 28px play and the same disabled state on the four file states
that have no file, and the row's own 3px `.dot` on the in-flight row and on no other. That is the whole
test of "composed rather than redrawn" on a component whose rules had to be namespaced to be composed at
all.

**While a run is active the count reads 131, and it climbs.** It is a total of associations and
associations arrive during a run; the figures are tabular so the line does not shift, which is what the
count's own rule says they are for. The summary's kept figure reads 0 and is quiet, because 0 there
means "not counted yet" and not "nothing kept".

**The tallest left column sets the shortest viewport this screen fits in.** Measured, the side ends at
546.5px with the summary, 570.7px while syncing, 460.1px with the empty state and **640.1px** with the
fault, so the error state sets the floor at **737.1px**: 640.1 plus the 97px bar. At the 900px this is
drawn at, the fault's left column clears the bar by 163.7px.

## The three access levels

**The rule is one sentence, so it can be checked against this screen in one pass: a collaborator may add
a track, remove a track and sync, and may not rename, delete or manage shares, and those three stay
with the owner.** The three owner-only controls are **Rename**, **Delete playlist** and **share
management**, and the first two are menu items and the third is the Share item. They are **absent, not
disabled**, because a visible control that cannot be pressed is the fault the validator already checks
for in the track row.

| access | the overflow holds                       | the band         | the indicator        |
| ------ | ---------------------------------------- | ---------------- | -------------------- |
| owner  | Share, Rename, Sync now, Delete playlist | 224px of 286.4px | a lock with an arrow |
| write  | Sync now                                 | 224px of 286.4px | a person             |
| read   | nothing, so no button                    | 92px of 286.4px  | a person             |

**A read collaborator gets no overflow button rather than an empty one.** There is no action to take
from this screen at that level, and a menu with nothing in it is a control that opens onto a blank. The
shuffle stays, because shuffle is a property of playback rather than of a playlist and a person who
may listen may shuffle, so the action row is the shuffle alone at **32px** and the band is 92px.

**`access` and `hasShares` are two facts and treating them as one draws the wrong menu for somebody.**
`access` is the level that decides the menu. `hasShares` is a boolean about the playlist rather than
the reader. The three are drawn on three screens rather than three cards because one menu is open at a
time in the product, and the library measured that two open at once in a list would overlap: 170px of
panel against a 137px item.

## What composing these cost, and the three faults it found

**Every track row in the tree was 120.8px rather than 65px, and it was the playlist header's fault.**
`specimen.css` declares `.body` for the header's identity block. `track-row.html` declares its own
`.body` inside its own `.row` and never sets `display`, so the header's rule won on the two declarations
the row never mentioned: the row's title and sub line sat inside a 96px `min-height` flex column instead
of a 40px one, and every row measured 120.8px. **The 65px that the sync summary, the empty state and
this screen all quote was a number no specimen produced.**

The fix is one token of selector. Every legitimate consumer of that rule is a direct child of `.hdr`
and every illegitimate one is a child of `.row`, so the rule is now `.hdr > .body`, which separates them
on a fact about the markup rather than on a guess about which file came first. Proved
behaviour-preserving: all **fourteen** headers in the header's own specimen and all **nine** items on
the library measure the same before and after, to the digit, and the rows are **64.8px** after it, which
is 64 plus the 0.8px this environment renders a 1px border at.

**Every state word in every track row carried a dot it never asked for, and on a phone it cost a whole
line.** The same collision from a second angle. `specimen.css` declares `.state` for the header's sync
state, whose `::before` is a 7px mark in the state's own tone, and the track row's `.state` is a single
coloured word with no mark and no pseudo-element of its own. So every state word in the row was **15px**
wider than the word plus its 8px gap: measured on the track row's own specimen, `Downloading` was 86.85px
and is 71.85px, `Failed` 48.31px and 33.31px.

The cost worth knowing is on a phone, where the row is narrowest. The failed row's sentence, `Download
failed, will retry on the next sync`, fitted on **one** line at 390px and the mark pushed it onto
**two**, taking the row from **76.1px to 92.3px**: a whole 16.2px line, which is a quarter of a row. The
rule is now `.hdr .state, .mhdr .state`, proved the same way: all **nineteen** of the header's own states
and all **twenty** of the library's keep the 7px mark, and all fourteen header figures and all nine
library items are unchanged to the digit. The row's own 3px `.dot` span, the one it does ask for, is
unaffected, because it is a span and not a state.

**Five of the track row's class names are also `specimen.css`'s, so the row's rules have to be scoped to
be composed beside the header.** `row`, `play`, `state`, `lane` and `art` are declared in both files,
and on a screen that draws the header and the track row at once all five are on the page. `play` is the
one that cannot be worked around: the header's is 48px and the row's is 28px, and the morph's block
addresses the name **unprefixed** because the block has to be byte identical across every specimen that
carries it, so a screen drawing both unprefixed would have one of them win on source order with nothing
to say which.

The rules are therefore lifted and namespaced under `.tl` by the generator: a descendant combinator, so
every lifted rule's specificity goes up by one class. The **markup is not renamed**, so the morph's host
list is untouched and stays at four. Proved by putting it back: the row's play goes 28px to **48px**,
the row 64.8px to **72.8px**, and the fold **11 rows to 10**. The durable fix is a second shared block
with distinct names, which is a change to the track row and belongs to a ticket about the track row.

**Neither is the sync summary's problem, and that is measured.** Its class names are local to its own
file, so it needed no namespacing, and its four cells fit with room: 71px a cell against 60.01px for a
five-figure figure and 47.4px for the widest of the four words, which is "removed". The band sits on
`--bg` rather than on a `--surface` panel, which its own record hands to the screen: every pairing holds
either way, and a panel here would buy nothing over a left column that already has a surface.

**One fault was mine and no check in the tree could have seen it.** The name is an anchor, and an
anchor does not inherit: the user agent's `a { color }` beat any inherited value, so the playlist's name
drew in the browser's link colour, `rgb(158, 158, 255)`, and underlined. The fix is the library's own
rule, `color: inherit` and `text-decoration: none`, and the way home takes the underline and not the
colour, because its colour is its own and deliberately muted. Proved by putting it back: the colour
returns to `rgb(158, 158, 255)` and the underline with it. Nothing catches this, because the value is a
user-agent default and not a literal in a file.

## The figures, and the width each came from

| what                            | at 1056 x 900                 |
| ------------------------------- | ----------------------------- |
| the frame's content box         | 1056 x 900                    |
| the left column                 | 320px, 40px above its floor   |
| the gutter                      | 24px                          |
| the track list                  | 712px                         |
| a track row                     | 64.8px                        |
| a row's title column            | 516px                         |
| the cover                       | 288px square                  |
| the name's text column          | 260px, 22 characters          |
| the meta line                   | 198.16px in 288px             |
| the band                        | 286.4px                       |
| the play, or the transport      | 48px, or 136px                |
| a read collaborator's band      | 92px                          |
| the scrim                       | 80px, 27.8% of the cover      |
| the summary's cells             | 71px each                     |
| the card                        | 400.4px in every state        |
| the left column's height        | 486.8px, ending at 546.5px    |
| the bar's top                   | 803.8px                       |
| the bar's row                   | 427.2px 136px 427.2px         |
| the bar's play, off centre      | 0px                           |
| the bar's shuffle               | flex, 495.2px right of centre |
| the bar's seeker                | 480px                         |
| the bar's title room            | 375.2px for 338.85px of name  |
| rows above the bar              | 11 of 14                      |
| the shortest viewport that fits | 737.1px, set by the fault     |

Every one of these is a computed box read out of the generated file at 1056 wide and 900 tall, not a
figure read off a stylesheet. The 0.8px in the row height and in the bar is this environment rendering
a 1px border at 0.8, which
[the playlist header's record](../components/playlist-header.md)
already accounts for.

The phone's figures are in their own table rather than as more rows in that one, and the reason is the
same warning this record opens with: a row in a table headed by 1056 has told its reader the figure is a
1056 figure.

|                             | at 390 x 844                         | where it came from                         |
| --------------------------- | ------------------------------------ | ------------------------------------------ |
| the arrangement             | 390 x 844, content **388.4 x 842.4** | the library's own frame                    |
| the header                  | 136px                                | the header's row arrangement, unmodified   |
| the cover                   | 96px                                 | the header's own cover                     |
| the identity block          | 180.4px                              | 96 + 20 + 180.4 + 20 + 72                  |
| the actions column          | 72px wide, 92px tall                 | 48px play above a 72px row of two          |
| the name's column           | 152.4px for a 204px name             | 13 characters of 17                        |
| the sync line               | 70.78px, one line                    | the time is off; it needs 198.16px with it |
| the header, time on         | 136.6px                              | the time arrives at 81.71px and wraps      |
| the identity block, playing | 116.4px                              | the actions are 136px wide while playing   |
| the name's column, playing  | 88.4px                               | 7 of 17, the tightest width on the screen  |
| the read level's identity   | 204.4px                              | the shuffle alone, so 48px of actions      |
| the summary                 | 66.4px, 90.6px in flight             | four 88.1px cells and the flight line      |
| the sync error              | 180px                                | against the summary's 66.4px               |
| the empty state             | 220.4px                              | prose on two lines and its promise on two  |
| the list's top              | 222.4px                              | 136 + 20 + 66.4                            |
| the bar's top               | 745.4px                              | 842.4 less the 97px bar                    |
| rows above the bar          | 7 of 14                              | two of the rows are 76.1px, not 64.8       |
| rows above it, in error     | 5 of 14                              | the error is 113.6px more than the summary |
| the shortest viewport       | 433px                                | set by the error frame, as on the desk     |

## Not drawn in this pass

**What the mobile pass closed, and what it cost to close it.** The arrangement could not be assumed from
the web one because
[the transport's own](../components/header-transport.md) measures absolute pixels, three equal 48px
steps costing 160px of the actions column, one row of five costing 208px and the title column landing at
750px, 670px or 718px, and **it never states the width it measured those at**. Its sibling records name
both widths explicitly, so the omission was that record's alone; it is now attributed in place and those
numbers are **1056px** figures. The arrangement is drawn above. What the pass found that scaling the web
one would have hidden: the header's **row** and not its card is the one that fits, at 136px against
470.4px, which is nine rows against four; the sync line is 17.76px short of its own three spans and
wraps its time inside itself rather than its row, so the time comes off; the actions column is 136px
wide while playing against 72px at rest, which at 88.4px is the tightest width anywhere on the screen;
and the height budget is spent by two 76.1px track rows rather than by any component above them, which
is why the ticket's eight rows is seven.

**The not-found state.** It has no component, and it needs one: its own record and its own specimen.
The empty state cannot stand in for it, because the empty state's words say that nothing is here because
the playlist has never synced, which is a lie for a playlist that was shared to this account and is not
any more. A playlist that does not exist and a playlist the account cannot see both answer 404 at one
status, so the state has to speak about both without claiming to know which happened.

**The share dialog and the add-a-video dialog.** Both are hosted here and nowhere else, on both
arrangements. The second is on the detail only, with this playlist preselected and any other writable
playlist selectable, and it issues one `POST /playlists/:id/tracks` per chosen playlist because no
multi-playlist route exists, which is a fact the checklist has to say out loud rather than imply. Both
need their own records, and a dialog is narrower on one arrangement than on the other, so neither can be
drawn once.

**A queue panel.** There is none, anywhere, and three records claimed there was. This one, the ticket and
the library's each said the queue "is a panel on the player bar record", and that record has never had one:
its only mention of a queue is a disabled state it describes for a queue that is empty while playback is
stopped. **The answer is that the track list is the queue**, so there is nothing to open and no trigger to
place: the right column already is the thing, in the state it is in, above the bar that plays it. A panel
that listed the same rows a few pixels away would be a second ordering of one list and a second place for
them to be stale. What the bar carries is the transport, and "queue" in the request that prompted this pass
meant the previous and next steps it already had.

## Usage

Do keep the two columns and the 320px left column. Do draw the count at zero on a playlist that has never
synced, because a stored integer of zero is an answer. Do gate the three owner-only controls by absence
rather than by disabling them, and do keep the sync error and the sync summary out of the same column. Do
attribute every width when you extend this to a phone, and measure the phone's header from nothing rather
than scaling the web one. Do not namespace a component's rules by renaming its classes when a scope on
the lifted rules settles the collision, because the morph's block addresses three of those names
unprefixed. Do not add a way-home control to the mobile arrangement. Do not draw a control for an access
level the glossary does not grant. Do not lift a component fragment as whichever of its variants the first
consumer happened to want: take the base and let the consumer add the variant class, and assert the class a
screen must not carry, because a 390 bar lifted into a 1056 frame is invisible in the markup and obvious in
the measurements.
