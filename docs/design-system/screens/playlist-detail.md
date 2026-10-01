# The playlist detail

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

`/playlists/:id` on web, pushed over the library root on mobile. The screen the product exists for: the
only place stored tracks become audible. It composes the playlist header, the track row, the sync summary,
the sync error, the empty state and the player bar; its own work is to arrange them, gate three controls on
`access`, and cover the states a playlist can be in.

**Two arrangements, kept apart.** Web is two columns inside a frame of a stated size. Mobile is a single
column pushed over the root: the header on top, the rows under it. Both are drawn, and every measurement
below is attributed to a width.

|                         | web, at 1056 x 900                      | mobile, at 390 x 844                    |
| ----------------------- | --------------------------------------- | --------------------------------------- |
| columns                 | two, 320px and 712px with a 24px gutter | one                                     |
| the playlist's identity | the header's card, 320px, a 288px cover | the header's row, 388.4px, a 96px cover |
| the way home            | a chevron and the word Playlists        | none, and the reason                    |
| the player bar          | centred, 97px, drawn at rest            | flush, 97px                             |
| the height budget       | a stated viewport, 803.8px of content   | 842.4 less a header less 97             |
| a track row             | 64.8px                                  | 64.8px, and two are 76.1                |
| the three access levels | drawn, one menu open each               | drawn, one menu open each               |
| the four states         | three of four drawn                     | three of four drawn                     |

At **web**, 1056 wide and 900 tall, the frame's content box is 1056 by 900 and the docked bar's top is at
803.8px. At **mobile**, 390 wide and 844 tall, the docked bar is the flush arrangement at **97px** and its
top is at 745.4px. Both frames take their border inside the stated width, so the phone's content box is
388.4 by 842.4.

## The mobile arrangement

One column, the header on top and the rows under it. A width on the desk is a division; a width on a phone
is the whole frame.

The header is the component's row arrangement, and the measurement settled it: at 390 the card is **470.4px**
and the row is **136px**, so on 842.4 less a 97px bar the row leaves **275px** of list against **609.4px**,
four plain rows against nine. The phone's header is a fresh measurement, not a scaling of the desk's:
[header-transport.md](../components/header-transport.md) measures absolute pixels without stating a width,
and now attributes its numbers as **1056px** figures in place. At 388.4 the phone's header is **136px** tall
with the time off the sync line and **136.6px** with it on, the cover is 96, the actions column is 72 and the
identity block is **180.4px**: 96 + 20 + 180.4 + 20 + 72 = 388.4.

The sync line's time is off on mobile, and the arithmetic is exact. The line needs **198.16px** (70.78 state,
3.91 separator, 99.47 time, 12.00 of gap either side), and the identity block has **180.4px**, so it is
**17.76px** short. The row is `flex-wrap: nowrap`, so the component's own answer is that the last span wraps
inside itself, arrives at **81.71px**, takes **32.4px** of height instead of 16.2, and leaves the separator
at the end of the line above it: a middot with nothing after it is not a separator. This is the decision [the
library record](library.md) already makes at 390 for the same reason, so the two screens agree. The time is
not lost except on the error frame, where the sync error replaces the summary and carries no stamp.

The header sits at the full width rather than inset by the page's 16px working inset, because `.hdr`
declares `padding: 20px 0` and is written to sit at its container's inline edges; insetting it would override
a rule the header's record owns and take the name's column from **152.4px** to 120px, 13 characters against
10 of a 204px name that truncates either way.

The tightest width on either arrangement is the header's while playing, a consequence of the component: the
actions column is a column, so the transport goes above the shuffle and the overflow and the column grows
from 72px at rest to **136px** while playing, dropping the identity block from **180.4px** to **116.4px** and
the name's column from 152.4px to **88.4px**, 7 characters of 17. The `read` level opens it up: with no
overflow button the action row is the shuffle alone at **32px** and the identity block rises to **204.4px**.

Seven of the fourteen rows clear the bar. The budget is 842.4 less a 136px header less a 97px bar, 609.4px,
and eight plain rows of 64.8px is 518.4px of it, but **two of the fourteen rows are 76.1px** (the failed and
unavailable ones, each with a reason line), and 22.6px of extra row is a third of a row. The list's top is
**222.4px**, the bar's top **745.4px**, the eighth row's bottom **764.2px**, so the answer is seven. The
in-flight summary is **90.6px** against the resting **66.4px** and costs no row, because both starts are
already under the bar. The error frame's sync error is **180px**, 113.6px more than the summary, so the list
starts at **336px** and **five** rows clear the bar; that frame sets the shortest viewport that fits the
arrangement at **433px** (136 of header, 20 of gap, 180 of error, 97 of bar).

Full-bleed costs 5.2px of a touch target on one control in one state, and it is left in place. The steps are
borderless, so their 44px target extends six pixels a side through a `::before` that paints nothing. While
playing the last item is a step, and its target's right edge lands at 546.4px against the frame's 541.2px:
**5.2px off the screen**, so the effective target is 38.8px, which still clears WCAG 2.2's 24px minimum, and
the docked bar on the same frame carries its own transport with the same 44px targets. Insetting the actions
column by 6px would fix it and cost 6px of the identity block on the frame that can least afford it.

Three collisions on this arrangement, all injected and asserted. The state mark unscoped makes every state
word **15px** wider and takes one row from 76.1px to **92.3px**. The row's play unscoped goes 28px to
**48px**, the row 64.8px to 72.8px, and the rows clearing the bar **7 to 6**. The header's `.body` rule
unscoped makes **every** row **120.8px**, all fourteen identical, and the rows clearing the bar 7 to 4.
Removing `bar--flush` proves the bar's arrangement: the row becomes `93.4px 136px 93.4px`, the transport 0px
off centre, and the seeker **45.8px** past the bar's edge.

## The columns, and the number under the left one

The left column is **320px**, 40px above its measured floor. The sync summary's band is four `1fr` cells with
a `--space-3` gap and its widest thing is a five-figure kept count at **60.01px**; a column of `W` gives each
cell `floor((W - 36) / 4)` and the arithmetic floor is **276.04px**, but at 276px the cell is 60px and the
figure 60.01px, so the first width that fits is **280px**. The header's own meta line is the other floor and
is not the binding one: `Up to date · Synced 2 days ago` is **198.16px** in a 288px box, 89.84px of slack.

The gutter is **24px** and is the one number here that is a judgement rather than a measurement: at
`--space-4` the track list is 720px rather than 712px and nothing breaks, so the cost of either is zero. It
is `--space-6` because a gutter between two blocks of content is a different thing from a gutter between two
pieces of a table.

Everything else is left over: 1056 less 320 less 24 is **712px** for the track list, and a 712px row's title
column is **516px** after 196px of lanes and gaps (a 40px tile, the 28px reserved play lane, a 52px duration,
a 28px action lane, and the four 12px gaps).

## The left column is the header's own card

There is no third arrangement of the header. The left column is the header's card arrangement at **320px**
rather than the 356.4px [library](library.md) draws it at, so the only thing this screen decided is a width.
The cover is **288px** against the header's own 324.4px, so the artwork is smaller here than on the
component's own phone, which is the direction the width was chosen. The scrim is a fixed 80px, **27.8%** of
a 288px picture against **24.7%** of the 324.4px cover, which is the header's own recorded reason for knowing
a cover's size before choosing one. The name's text column is **260px** after the indicator's 20px and the
row's 8px gap, **22 characters** against the header's own card's 25.

The card is **400.4px** in every state, resting and playing, and so is the 286.4px band inside it: the
transport and the action row sit beside each other rather than instead of each other, which is the header's
own swap. The cover draws no equalizer strip: the strip's bar count solves `7n - 4` and gives **34.57 bars**
at 288px, which the strip's record calls a texture rather than an equalizer, and on this screen the playing
row says so with a shape on its own 40px tile in the list, where a reader scanning looks.

## The way home

A word and a chevron, both load-bearing: the word names the destination and the chevron says which
direction. The link measures **76.45 by 18.9px** in a **58.9px** row. `chevron-left` went into the pin for
this one control, one path `M15 6l-6 6l6 6` verbatim from `@tabler/icons` 3.48.0, centred on both axes and
carrying no optical correction: there is no `PINNED_OPTICAL` entry for it, and that absence is the assertion.
It costs one row of fourteen: **11 whole rows** clear the 803.8px bar with the way home and **12** without,
the twelfth row's bottom at 838.1px against 779.2px.

## The states

Three of the four are compositions and none is redrawn. Never synced is the
[empty state](../components/empty-state.md) in the list area with the card beside it unchanged. Syncing is
the header's busy form plus the [sync summary's](../components/sync-summary.md) in-flight figure. Error is
the [sync error](../components/sync-error.md) **in place of** the summary rather than beside it, because the
summary says what the run did and the error says what to do, and a column carrying both would put the same
news in the same 320px twice.

The count reads 0 on a playlist that has never synced, because `trackCount` is a stored integer and a stored
one is never unknown. The play is **disabled** rather than absent there: a control that is there and cannot
be pressed is a different thing from a control that is not there. Both buttons this screen composes carry
`rotate-clockwise` at `--icon-sm`, the glyph the overflow already drew on the same verb; a `Sync now` button
is **126.81px** with the mark and **115.8px** busy, the mark costing the layout nothing because the two
columns are centred and the left column still ends at **460.1px** with the empty state and **640.1px** with
the fault.

One frame has no player bar, which is the bar's own record: a bar present with nothing to play is not drawn,
and a bar carrying a track on a playlist that has never synced would assert playback the same frame's card
says cannot happen. The other seven frames carry the bar, which is the first screen in the product where it
is drawn at rest.

The docked bar is the web arrangement. The lift out of the [player bar's](../components/player-bar.md) record
had taken the 390 drawing, so every web frame carried `bar--flush`: the transport landed 443.2px off the
bar's centre, the shuffle came back `display: none`, and the seeker ran **956.17px** wide where that record
caps it at 480px. The lift now takes the centred arrangement as its base and the library, whose bar really is
388.4px, asks for the flush one by adding the class. Measured on the seven barred frames at 1056: the row is
`427.2px 136px 427.2px`, the transport posts **0px** of offset, the shuffle is `flex` at **495.2px** right of
centre, the seeker is **480px**, and the title has **375.2px** for the same 338.85px of name it draws whole.

Every state-carrying row was checked against the track row's own specimen and matches it exactly: the same
child order and classes inside `.sub`, the same state widths to the digit (`Downloading` 71.85px, `Pending`
44.61px, `Failed` 33.31px, `Unavailable` 64.66px, `Removed, still here` 105.49px), the same 64.8px height,
the same 28px play, and the row's own 3px `.dot` on the in-flight row and on no other. While a run is active
the count reads 131 and climbs, tabular so the line does not shift, and the summary's kept figure reads 0,
which means "not counted yet".

The tallest left column sets the shortest viewport: the side ends at 546.5px with the summary, 570.7px while
syncing, 460.1px with the empty state and **640.1px** with the fault, so the error state sets the floor at
**737.1px** (640.1 plus the 97px bar).

## The three access levels

The rule is one sentence: a collaborator may add a track, remove a track and sync, and may not rename, delete
or manage shares, which stay with the owner. The three owner-only controls (**Rename**, **Delete playlist**
and share management) are **absent, not disabled**, because a visible control that cannot be pressed is the
fault the validator already checks for in the track row.

| access | the overflow holds                       | the band         | the indicator        |
| ------ | ---------------------------------------- | ---------------- | -------------------- |
| owner  | Share, Rename, Sync now, Delete playlist | 224px of 286.4px | a lock with an arrow |
| write  | Sync now                                 | 224px of 286.4px | a person             |
| read   | nothing, so no button                    | 92px of 286.4px  | a person             |

A `read` collaborator gets no overflow button rather than an empty one, and the shuffle stays, so the action
row is the shuffle alone at **32px** and the band is 92px. `access` decides the menu; `hasShares` is a
boolean about the playlist rather than the reader, and treating the two as one draws the wrong menu for
somebody. The three levels are drawn on three screens rather than three cards because one menu is open at a
time in the product.

## What composing these cost

**Every track row in the tree was 120.8px rather than 65px, and it was the playlist header's fault.**
`specimen.css` declares `.body` for the header's identity block, and `track-row.html` declares its own `.body`
inside its own `.row` without setting `display`, so the header's rule won on the two declarations the row
never mentioned and every row measured 120.8px. The fix is one token of selector: every legitimate consumer
is a direct child of `.hdr` and every illegitimate one is a child of `.row`, so the rule is `.hdr > .body`.
Proved behaviour-preserving: all fourteen headers in the header's own specimen and all nine items on the
library measure the same before and after, and the rows are **64.8px** after (64 plus the 0.8px this
environment renders a 1px border at).

**Every state word in every track row carried a dot it never asked for.** The same collision from a second
angle: `specimen.css` declares `.state` for the header, whose `::before` is a 7px mark, and the row's
`.state` is a single coloured word with no mark. Every state word in the row was **15px** wider, so on a
phone the failed row's sentence, which fitted on one line at 390px, was pushed onto two, taking the row from
**76.1px to 92.3px**. The rule is now `.hdr .state, .mhdr .state`. The row's own 3px `.dot` span is
unaffected, being a span and not a state.

**Five of the track row's class names are also `specimen.css`'s** (`row`, `play`, `state`, `lane`, `art`), so
on a screen drawing the header and the row at once the row's rules had to be scoped under `.tl` by the
generator, a descendant combinator that raises every lifted rule's specificity by one class. The markup is
not renamed, so the morph's host list stays at four. Proved by putting it back: the row's play goes 28px to
**48px**, the row 64.8px to 72.8px, and the fold 11 rows to 10. **The durable fix is a second shared block
with distinct names, which is a change to the track row and belongs to a ticket about the track row.**

The sync summary needed no such scoping, because its class names are local: its four cells are 71px each
against 60.01px for a five-figure figure and 47.4px for "removed".

**The name is an anchor, and an anchor does not inherit:** the user agent's `a { color }` beat any inherited
value, so the name drew in the browser's link colour and underlined. The fix is the library's own rule,
`color: inherit` and `text-decoration: none`; the way home takes the underline and not the colour, because
its colour is deliberately muted.

## The figures

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

Every figure is a computed box read out of the generated file at 1056 wide and 900 tall. The 0.8px in the
row height and in the bar is this environment rendering a 1px border at 0.8, which
[the playlist header's record](../components/playlist-header.md) already accounts for.

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

The mobile arrangement could not be assumed from the web one, because
[the transport's own](../components/header-transport.md) record measured absolute pixels and never stated a
width; it is now attributed in place as **1056px** figures. What scaling would have hidden: the header's
**row** and not its card is the one that fits at 390 (136px against 470.4px); the sync line wraps its time
inside itself rather than its row, so the time comes off; the actions column is 136px wide while playing
against 72px at rest, which at 88.4px is the tightest width anywhere; and the height budget is spent by two
76.1px track rows rather than by any component above them.

**The not-found state.** It has no component and needs one. The empty state cannot stand in for it, because
its words say nothing is here because the playlist has never synced, which is a lie for a playlist that was
shared and is not any more. A playlist that does not exist and one the account cannot see both answer 404 at
one status, so the state has to speak about both without claiming to know which happened.

**The share dialog and the add-a-video dialog.** Both are hosted here and nowhere else. The second carries
this playlist preselected and any other writable playlist selectable, and issues one request per chosen
playlist because no multi-playlist route exists, which the checklist has to say rather than imply. Both need
their own records, and a dialog is narrower on one arrangement than the other, so neither can be drawn once.

**A queue panel. There is none, and three records claimed there was.** The answer is that **the track list is
the queue**, so there is nothing to open and no trigger to place: the right column already is the thing,
above the bar that plays it. A panel listing the same rows a few pixels away would be a second ordering of
one list and a second place for them to be stale. What the bar carries is the transport.

## Usage

Do keep the two columns and the 320px left column. Do draw the count at zero on a playlist that has never
synced. Do gate the three owner-only controls by absence rather than disabling, and keep the sync error and
the sync summary out of the same column. Do measure a phone's header from nothing rather than scaling the web
one. Do not namespace a component's rules by renaming its classes when a scope on the lifted rules settles
the collision, because the morph's block addresses three of those names unprefixed. Do not add a way-home
control to the mobile arrangement. Do not draw a control for an access level the glossary does not grant. Do
not lift a component fragment as whichever variant the first consumer happened to want: take the base and let
the consumer add the variant class.
