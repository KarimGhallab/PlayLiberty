# The library

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The route a user lands on, and the only entry point to content. A header and a list.

## Two arrangements, and the width every number came from

**Web is `/` and mobile is the app root, and this is one record carrying both rather than two
records with a variant between them.** The token layer is one value set consumed by two runtimes and
React Native cannot resolve `var()`, so the design system is already one system with two renderings,
and splitting a screen's design by client would contradict the thing the whole token layer exists to
be. A screen record that carries two arrangements can be misread as one arrangement and a variant, so
every figure below names its width, and a reader who reads only the web half can tell it is half.

The two widths are **1056** and **390**. 1056 is not a number anybody chose: it is the content column
this file's own specimen page frame produces at its max width, being `1120px` less `--space-7` either
side. It is worth saying so, because the empty-state record quotes **1014** and the two are not the
same column. 1014 is 1056 one step further in, inside a `.panel`, with the panel's own
`--space-5` padding and 1px borders taken off. A screen is not a panel, so the screen's number is the
wider one and the difference is named here rather than left for a reader to trip over.

**What differs between them, before any number:** the header is 78.4px on web and 68px on mobile; the
surface is `--bg` in both and the items sit on it directly; an item is 136px on web and a card is
172.2px in a two-column grid on mobile; the signed-out state exists only on mobile; and the arriving
player bar costs the two arrangements the same 97px. What does not differ is the component, which is
the thing this record was wrong about: an item is
[the playlist header](../components/playlist-header.md) in both, at the arrangements that record owns,
and this screen states which width it drew each at.

## The item is the playlist header, and the mobile list is a grid

**An item is the playlist header. Not a component of this screen's own, and not a
smaller thing that resembles it.** This screen is a gallery of headers, so an item
is the header at 136px on web and a card on mobile, and
[that record](../components/playlist-header.md) owns the component at both
arrangements. Its rules live in `docs/design/specimen.css` beside the equalizer strip,
because there are two consumers of them and this one is the second.

That is a correction, and the fault it corrects is worth recording because it was
invisible until the reuse. The first version of this screen drew an 88.8px row
carrying the header's _identity block_ alone at 64px and `--text-md`: its own cover,
its own name line, its own count and its own share indicator, under five class names
of its own. It had no sync line and no actions, which is most of why it was 47px
shorter than the header. Five new class names are invisible to anything that
compares file names, so nothing reported the duplication, and it had already produced
the fault the header's own comment calls "the mistake this line made first":
`flex: 1` on the name, where the header says `flex: 0 1 auto` so a growing name
cannot push the indicator to the far edge. It looked right only because a count lane
happened to bound the row.

**What the item adds to the component is four things, and all four are consequences
of a header becoming one item in a list.** The links, the grid it stacks in, the
permission facts the overflow is gated on, and nothing else.

## The mobile list is two columns, and what that cost

**Two columns and not one, because one card per row put a single card above the
fold.** At 390 the content area under the library's own 56px header is 788px, so one
436.8px card cleared it and 1.8 cards fit with a fraction allowed. Two columns put
**six whole cards** above the fold at the card's present 223.6 or 247.3px, or four with the
player bar docked.

**Three columns was asked for and is not available, and the reason is arithmetic
rather than preference.** At three the track is 111.33px and the card's content needs
154px, so it overruns its column; the action row is 76px against a 47.33px cover
content box; and the 80px control band would be **100.9%** of a 79.33px cover, taller
than the picture it sits on. The cover needs no second size at either count, because
`.mart` is `aspect-ratio: 1` and square by construction rather than by a number.

**Four controls once sat on the picture and one does now, and the arithmetic ran in one direction the
whole way.** The cover is 140.2px and 108.2px of that is inside the band's own 16px padding, while the
play, the shuffle and the overflow together need 168px. They did not fit, and the failure was not
graceful: the overflow sat past the right edge of the picture and was clipped by it, and on the one
card that was playing the transport and the action row needed 256px, which overran the card by 85px and
landed on its neighbour. An intermediate version kept the play and the shuffle in the band, which were
104px of 108.2px, and put the overflow on the surface below. Three things have happened since, each
removing a control rather than moving one: the overflow went because rename, delete, managing shares
and syncing on demand are all available from inside the playlist on a phone; the transport went
because a 172.2px card has room for one 48px control and not for three at 136px; and the shuffle went
to the picture's top left, because a second 84px scrim band would be 192px of a 140.2px cover and a
32px chip is 5.2% of it.

**The band holds one control and it is the same control in both states**, which is the header's own
play, becoming the header's own pause when this is the playlist that is playing. Nothing about the
card moves when it starts: the band keeps its 16px padding, the play stays at the same x, and the
equalizer strip is not drawn on a card at either state. So a playing card differs from a resting one
by a glyph and a label and by the accent colour of that glyph, and the cost of that is named rather
than paid quietly: **the playing card is the only signal of what is playing, and it is 48px of
button on a shelf of six.** On web the item also carries the strip, so there the state is legible
without a press; on a card there is nowhere to put a strip, so the pause glyph is the whole of it.

**The mobile card drops or moves five things, and all five are this screen's decisions rather
than the component's.** The header's own card is untouched: these are declared here, not in
`specimen.css`, and the header record says which five they are.

1. **No overflow at all.** Rename, delete, manage shares and sync on demand are all available from
   inside the playlist on a phone, so a card carries no menu and no button for one. That also retires
   the three-overflows section from this arrangement: `access` gating is a web question now.
2. **The sync line does not get a line of its own: the state joins the count and the time is left
   off.** So `128 tracks` at the left and `Up to date` at the right, and `Sync failed` alone on the one
   card with no count. This withdraws the cost this record named when it reversed the opposite decision,
   that **a failed playlist is invisible on a phone until somebody opens it.** It is no longer paid, and
   the withdrawal is measured rather than asserted: the card is **223.6px** tall against the 247.3px
   the two facts came to on two lines, so pairing them is worth 23.7px, and against the 329px to
   345.2px the header's full sync line came to.
3. **The count keeps its unit word and its line may be two lines tall**, which is what putting the two
   facts at opposite ends costs: a card is 223.6px or 247.3px depending on whether its count and its
   state together exceed the line. That is the reversal of the constant-height claim above, made
   knowingly, and it is stated as a cost rather than argued away.
4. **The name drops a step**, from `--text-xl` 24px to `--text-lg` 20px, which buys about two
   characters of a column showing ten. It is the one place this arrangement re-decides a type size
   [the header](../components/playlist-header.md) fixed, and the header's own reason for fixing it,
   that dropping a size means re-deciding how much of a long name survives, is why this screen may
   and the header may not.
5. **Both rows of the card end on the same edge.** The count and the state are at opposite ends of the
   status line, and the name and the share indicator at opposite ends of the name line. The second of
   those reverses [the header's own decision](../components/playlist-header.md) that the indicator
   belongs beside the name, and the cost is measured as nothing.
6. **No transport, and the shuffle moves to the top left corner of the picture.** The card's band holds
   one control and the transport's three were what made the band's padding have to go to zero. What
   the shuffle gains from the top left is an alignment it could not have on the right: the chip's centre
   and the play's centre are the same vertical axis down the picture. It was on the right because it was
   inset to sit flush with the transport's right edge, and that derivation had nothing left to point at
   once the transport was gone.

**Sharing a left edge is not sharing a centre, and that is what this alignment turned on.** The chip is
a 32px box and the play is 48px, so insetting both by the band's own `--space-4` put both left edges at
16px and their centres **8px apart**, which is exactly half the difference in widths. Two rounded
controls of different sizes on one vertical line read as misaligned because the eye lines up centres and
not edges. The inset is therefore `--space-4` plus half of 16, which is **24px and `--space-6`**, a
token rather than a derived literal. Measured on all six cards, resting and playing, the chip's centre
and the play's centre are both **40.8px** from the picture's left edge, **0px apart**, and the 44px and
48px targets are both wholly inside the picture.

**I got this wrong twice and both errors are kept rather than tidied away.** The first version inset by
the band's own `--space-4` and called the shared left edge the alignment; the centres were 8px apart.
The second read half the width difference as `--space-1`, put the inset at `--space-5`, and then argued
in the stylesheet's own comment that the exact 24px figure must be wrong because it would centre the
chip on the play rather than on the picture. Both halves of that were backwards: 24px is precisely what
centres the chip on the play, the play is not centred on the picture either, and the play does not move.
Measured, `--space-4` gives 8px apart, `--space-5` gives 4px, and `--space-6` gives 0.

**The count is at the left and the state at the right, and there is no separator between them.** The
header separates its state from its time with a middot because the two are adjacent; here they are not,
so a middot would be a third thing floating in the middle of the line and the `--space-2` gap is what
guarantees they never touch. `gap` is the minimum and `space-between` only adds to it, so **8px is a
floor rather than a figure**: measured, the gap runs from 8px on a full line to 52.62px on the emptiest.

**Putting the state right is a scanning decision and it is the reason for the whole change.** The three
state words are **57px**, **70.8px** and **73.76px** wide, and only right alignment makes the longest of
them read as a column edge, so a `Sync failed` in `--tone-failed` sits at the same x on every card and a
shelf of forty can be read for the fault. Measured on all six cards, every state word's right edge is
0px from the column's. The card with no count is the case that needed a rule of its own: `space-between`
puts a lone item at flex-start, which put its `Sync failed` at the left edge of the card and broke the
column on **exactly the card most likely to have a fault**, so the state carries `margin-inline-start:
auto` when it is an only child.

**The count keeps its unit word, and the price is that a card is no longer the same height as its
neighbours.** The two cannot both fit at opposite ends: "1284 tracks" is **74.66px** and `Sync failed`
with its dot is **73.76px**, so **148.42px** of a 140.2px column, over by 8.22. Dropping the count's
number to `--text-xs` still needs **143.64px**, over by 3.44. Three things fit and the choice was made
between them: drop the dot, drop the noun, or let the noun wrap. **It wraps.** The state is `flex: none`
and nowrap, the count is `flex: 0 1 auto` with `flex-wrap: wrap`, and the count's number is `flex: none`
inside it, so what drops to a line of its own is the noun and never the figure, because a track count
that broke mid-number would be a lie rather than a truncation. Measured on the six fixtures: four cards
at 223.6px and two at 247.3px, the two being the ones whose count and state together exceed the line.

**That is a reversal of a decision two changes ago, and the earlier reasoning was wrong in a way worth
keeping.** The count had lost its unit word on the measurement above, and the argument was that the dot
was the card's only colour-coded mark and should not be spent to buy a noun. The measurement that
argument rested on was itself misapplied: it was taken as if the two facts were adjacent, which is what
the header does and what a card at 140.2px does not have to do. **The two only conflict once they are
at opposite ends and the count is allowed to shrink**, and they are not adjacent on a card.

**The name row's two items go to opposite ends too, which reverses the header's own decision, and the
cost is measured as nothing.** The header's name is `flex: 0 1 auto` and explicitly not `flex: 1`,
because a growing name "pushes the indicator to the far edge, which is a different design: the
indicator stops being attached to the name and becomes a second thing aligned with the cover". That is
what `space-between` does, and it is being asked for on the grid's grounds: the status line terminates
on the right, so the name line does too and both rows of a card end on the same edge. Measured, the cost
is nil: the name's column is 140.2px less the indicator's **20px** and the row's own 8px gap, so the
name truncates in the same 112.2px either way, **four of the six fixtures are cut with the indicator at
the far edge exactly as four are cut with it beside the text**, and the fault the header's comment
predicts, an indicator truncated away with the name, cannot happen because `.share` is `flex-shrink: 0`.
So the header's reason does not transfer to a card in a column, and on the row the indicator still
belongs beside the text.

**The line is aligned on the baseline and not centred, and the measurement behind that is the
interesting part.** A flex item with no baseline of its own has one synthesized from its border box,
and `.state`'s first flex item is the dot: a 7px box with no text in it, so the baseline flexbox picks
for the state is the dot's **bottom edge**. Inside a 16.2px `.state`, the dot's bottom edge is at
11.6px from the top and so is the word's own baseline. That is a coincidence of this font's metrics at
this size, and it is the whole reason baseline alignment works here with no correction. Measured on all
five cards carrying both facts, the number and the word are each **14.4px** from the top of the line,
**0px apart**, on the cards whose count stays on one line and on the two whose count does not.

**It is fragile, and nothing in the tree checks it.** Change the dot's height or the line height and
the dot's bottom edge stops coinciding with the word's baseline, and the word lifts by the difference.
That is the same class of fault as the header's own missing indicator: nothing about the widths
changes, no assertion fails, and the only way to see it is to look at two pieces of type on one line.
A 3.5px correction is the number that difference would be at these metrics, and it was measured and
rejected: an earlier probe put it in and it made the line 3.5px _wrong_. That probe was itself wrong,
because a baseline probe inserted inside an `inline-flex` becomes a flex item and has `vertical-align`
ignored, so it measured its own synthesized baseline rather than the text's.

**Four ways of paying for the status line were measured while it was a middot line, and the
conclusion no longer applies.** At the worst case, "Sync failed" against "1284 tracks", in 140.2px of
column: the header exactly as it draws it, dot and unit and `--space-2`, needs **168.3px** and is over
by 28.1. Suppressing the dot for real rather than subtracting 15px for it needs **153.3px**, over by
13.1. The same at `--space-1` needs **145.3px**, over by 5.1. The same with the whole count at
`--text-xs` needs **140.6px**, over by **0.4**, which is the closest any of them comes and is still
over. Dropping the unit needs **127.3px** and fits with **12.9px** to spare. The figures are kept
because they were measured and they are the reason the noun was dropped for two changes, and because
the mistake in them is the useful part: **every one of them measured the two facts as if they were
adjacent**, which is what a middot line does. They only compete once they are at opposite ends and the
count is allowed to shrink.

**The state's own size had to be put back, and it is worth a line because it was a fault rather than
a choice.** The header's `.state` inherits `--text-xs` from `.meta`, and this line has no `.meta` in
it, so the state was rendering at the card body's `--text-sm`: measured 83.6px for "Sync failed"
against the header's own 73.8px, a 9.8px penalty on a line that can least afford one. The fix
is `font-size: var(--text-xs)` on this screen's own line, not a change to `.state`, because the state
is the header's element and every other arrangement gets its size from `.meta` correctly.

**The count is the only thing on the line that may give way, and that is what keeps the noun.** The
state is `flex: none` and nowrap, the count is `flex: 0 1 auto` with `flex-wrap: wrap`, and the count's
number is `flex: none` inside it. So the noun drops to a line of its own and the figure never does: a
track count that broke between its digits would be a lie rather than a truncation. Both faults were
proved by putting them back: `flex: none` on the count takes the wrap away and returns the card to
223.6px, and `align-items: center` puts the baselines **1.6px apart**.

**The state's own size had to be put back, and it is worth a line because it was a fault rather than
a choice.** The header's `.state` inherits `--text-xs` from `.meta`, and this line has no `.meta` in
it, so the state was rendering at the card body's `--text-sm`: measured 83.6px for "Sync failed"
against the header's own 73.8px, a 9.8px penalty, which is 9.8px of the 12.9 that was left. The fix
is `font-size: var(--text-xs)` on this screen's own line, not a change to `.state`, because the state
is the header's element and every other arrangement gets its size from `.meta` correctly.

**A card is 223.6 or 247.3px tall and six clear the fold**, or four with the bar docked. Two separate
changes bought that height rather than one. Pairing the two status facts instead of stacking them is
worth 23.7px: the card was 329px to 345.2px with the header's full sync line under the name, 247.3px
with the state and the count on two lines, and 223.6px with them on one. Putting them at opposite
ends has given 23.7px of that back on the two cards whose count wraps, and the fold is unaffected
because the taller cards fall where they still fit: measured against the 776px content area, the six
fixtures finish at 247.3, 247.3, 482.9, 482.9, 742.2 and 742.2px, so all six are whole and four of them
survive the bar's 97px. That is luck rather than design and it would not survive a seventh fixture
with a four-figure count in the second row. Dropping the transport is worth a further **24.2px of the
band's own room but nothing of the card's height**, because the band was always 80px whatever it held;
what it bought was the band's padding, which no longer has to go to zero to fit 136px of transport, so
the play sits 16px in rather than against the picture's edge.

**The picture's two controls now share a centre line, which is what the shuffle's move bought.** Both
centres are at **40.8px** from the picture's left, measured on all six cards and in both states, so the
chip's 44px target and the play's 48px target are stacked on one axis rather than on opposite corners.
That is a different alignment from the one the chip had on the right, where it was inset 4.2px to sit
flush with the transport's right edge and the shuffle and the `track-next` icon shared an x. The figures
for that are kept below because they were measured and the reasoning was sound for the drawing that
existed: they were **13.4px apart** before the inset and **1.6px** after, and the 1.6px was twice the
0.8px a 1px border renders at in this environment. What changed is not the arithmetic but the thing it
pointed at.

**The scrim stays and still covers 57.1% of a 140.2px cover**, against 24.7% of the 324.4px cover one
card per row gave it. That is the cost of leading with the artwork in a grid, and
[the header's own argument](../components/playlist-header.md) is that a band has to be short enough not
to eat the artwork. It is recorded as a cost rather than answered, because the grid is worth more than
the band.

**One fault here was invisible to every measurement of the component, and it is worth its own
paragraph.** The band is a div 80px tall laid over the bottom of the picture, and a div receives
events across its whole box, so every part of it that was not a control swallowed the tap instead of
passing it to the cover link underneath. Measured over a 10 by 10 grid of points on a resting card:
27% of the picture was the link, 18% was the control, and **55% was the band's own empty padding**. A
picture that looks tappable and is not over more than half of itself is not a fault any measurement of
the card would find, because the card has no link under it; the link is this screen's. The fix is
`pointer-events: none` on the band and `auto` on the controls inside it, and the dead area is now
**0%** on every card, with the link's share up from 27% to 63% and both controls still taking their
hits.

**The add control is a floating action button on mobile and a labelled button in the header on web, and
what the change costs is the scroll.** The header carries only the title on mobile, so it is **56px**
rather than 68px and the content area is **788px** rather than 776px. That 12px is free. The button is
**56 by 56px**, a circle, inset `--space-4` from the frame's right and bottom, and when the 97px bar is
docked it sits **113px up** so it clears the bar by 16px. Measured, it covers **32.5% of a 172.2px
card's width** and 15.7% of the content.

**It needs 88px of clearance at rest and 185px once the bar is docked**, which is 23.8% of the content
area paid in scroll for a control that occupies 15.7% of the width. The button does not scroll with
the grid, so without the clearance the last card sits under it permanently and no scroll gets it out:
a person scrolls to the end of a shelf of forty and the last playlist's name is behind a green circle.
At the resting fold the button covers **no card content at all**, measured by intersecting its box
against every card's picture, name and status line: it sits over the last card's own background, below
its status line. As the grid scrolls it necessarily crosses cards, which is the FAB's cost and the
reason the clearance is declared rather than left to the implementation.

**There is no shadow token in this system, so a control that has to read as floating brings its own
ground.** The button is `--accent` on `--bg`, the 5.85:1 the add button's legend already had, so the
word going away cost nothing and the glyph inherits the pairing.

**Its z-index is `--z-sticky`, which was first written as `--z-overlay` and corrected by drawing the
button under the dialog it opens.** Three requirements meet there: above the grid and over a card's
picture, below the 97px bar at `--z-player`, and below a dialog's scrim at `--z-overlay`. `--z-overlay`
satisfies the first and fails the third, and a dialog is what this very control opens, so a button at
that tier sits **in front of the scrim that dims it** rather than behind it. Measured, with the sheet
taken out of the way so the scrim is the only thing that can be on top: at `--z-sticky` all three
sample points on the button hit the scrim, and at `--z-overlay` all three hit the button. The add-dialog
frame now draws the button, which is what the screen actually looks like at that moment.

**The glyph is `--icon-lg` 28px and the size was re-decided rather than carried.** The header's button
put the plus at `--icon-sm` because it sat beside a `--text-sm` label and the two were a pair, and
[the icons record](../icons.md) makes that argument. With no label there is no pair: 16px in a 56px
circle is **29% of the box** and measures as a small mark in a large one, where 28px is **50%**. The
56px box was measured against the 48px one that was also on the table, and 48px would leave the same
28px glyph at **58%** of itself, which is why the standard size and the standard icon go together.

**The name is on `aria-label` and there is no visible word, which is the shape's one accessibility
cost.** A sighted person is given a bare plus. That is why the glyph is a plus and not a
playlist-with-a-plus, and it is the reason the extended pill was not chosen: it measures 98 by 56px,
**56.9% of a card's width**, so more than half of one card would sit under a control at rest to keep a
four-letter word on screen.

**The empty shelf's frame gets no floating button, and that is a decision.** Its own action is a
full-width button in the middle of the screen, and a floating copy would put the action twice on the
one screen where a person has not seen either yet. That is the opposite of what the header and the
shelf already do to each other on web, where the duplication is recorded rather than hidden.

**What the grid asks the card for is four declarations, and every one is the grid asking for
something a card in a column never had to be told.** A grid item's automatic minimum size is its
min-content width, so `min-width: 0` on the item is what stops each card being held open by the width
of its own longest unbreakable content: measured, 189px of card in a 172.2px track before it and
172.2px after. The other three are on the blocks under the cover, which are the min-content itself,
the name line being the widest at 205.85px. They are declared here rather than in `specimen.css`
because they are the grid's requirement and not the card's, and a card in a column must not lose its
truncation to a rule only a grid needed.

**Every item carries a share indicator.** The first version of this list left the
indicator off its first row, which is the exact omission the header's name-line
comment warns about: "one card would eventually omit it and its indicator would be
truncated away with the name, silently". A row is a card, and `access` is on every
playlist, so a row without an indicator is a row that has decided some playlists have
no share state. All six items in this specimen carry one.

## The links, and why there are two of them and only one is announced

**An item cannot be a link, and that is forced rather than chosen.** It now holds a
play button, a shuffle and an overflow, and a button inside an anchor is invalid
HTML. So the item is a container and the navigation moved inside it: the cover and
the name are both links to the playlist, which is the arrangement a shelf of
destinations needs, because the alternative leaves a 356.4px square that does nothing
when tapped.

**The cover's link carries no accessible name and no tab stop**, so a screen reader
announces one link per item rather than two. `aria-hidden="true"` and
`tabindex="-1"` on the cover, the name carrying the label. The cost is in the DOM
rather than on screen: two links point at one destination, and a reader auditing the
markup sees both.

**The card's cover cannot be the link, because the card puts two buttons on the
picture.** So the picture stays a `div` and the link is a sibling of the controls
inside it, absolutely positioned over the picture. It paints below them because
`.macts` is positioned and comes later, which was checked by hit-testing rather than
assumed: the play button wins its own 48px, the dots win theirs, and the link wins
the rest of the picture.

**This is the only link in the system that is not underlined, and the tension is
recorded rather than hidden.** Nothing in the design system sets
`text-decoration`, so an underline is what a link gets by default and the breadcrumb
above this screen has one. Forty underlined names in a column is a texture rather
than a signal, because every item is a destination and the item itself is the
affordance, so underlining each one says the same thing forty times. The cost is
that a reader comparing the names here with the breadcrumb above them will notice
the difference. `color: inherit` is also needed and is not optional: an anchor does
not inherit, the user agent's `a { color }` beats any inherited value, and without it
the name would draw in the browser's link colour and stop being `--ink`.

## The three overflows, and what `access` decides

**`access` is on every playlist and the overflow is gated on it, and the glossary is
authoritative about the gate.** A Collaborator "may add a track, remove a track and
sync. They may not rename, delete, or manage shares: those three stay with the
owner." So of the header's four items an owner's overflow holds all four, a `write`
collaborator's holds `Sync now` alone, and a `read` collaborator's holds nothing.

**A read collaborator gets no overflow button at all**, rather than one with nothing
in it. There is no action to take from this screen, and a menu that opens onto a
blank is a control that lies about what it can do. The header's own no-tracks case
argues the opposite about Delete, that the overflow is exactly when you want it, and
that is true there and does not apply here: Delete is the owner's.

**The two collaborator items carry the same glyph and different menus, and that is
the honest picture of the permission model.** The indicator is coarser than `access`
is, one mark covering both collaborator levels, so what a person may do to an item is
invisible until its menu is open and then it is exact. On a shelf that matters more
than on a single header, because rows a person may rename sit next to rows they may
not. The level is shown where it acts.

**The three are drawn on the card and not on the item, because of which way the menu
opens.** The item's opens downward and is 170px tall against a 137px item, so two at
once overlap by 33px and the first one's last item sits behind the second's panel.
The card's opens upward into its own picture, measured at 89.2px below the picture's
top edge on a 324.4px cover, so two can be open at once and neither clips. In the
product opening one closes the others, so the overlap is a property of the specimen
rather than of the component, and it is why the header's own overflow section draws
exactly one.

## Shuffle is on every item, and that is the price of exact reuse

Forty items means forty `aria-pressed` shuffle toggles for one player's shuffle, and
shuffle is a property of playback rather than of a playlist. Dropping it from the
item and keeping it on the player bar and the detail screen's header was the
alternative, and it lost because the item is otherwise identical to the header and
one exception is easier to notice than forty controls. The cost is named here rather
than paid quietly.

## The count of what is missing, and what is deliberately absent

**A shared item says it is shared and not who shared it, because nothing can say who.** `access` and
`hasShares` landed on `PlaylistSchema` in ticket `18` and the item reads both. What the item cannot read
is the owner's name: `ownerAccountId` is a UUID, `GET /me` returns only the signed-in account, and
`GET /accounts` is a `sendNotImplemented` stub. Ticket `13` records that a shared item carries a
"shared by" line and that `ownerAccountId` and `GET /me` already supply it, and that is wrong on both
halves. So the line is wanted, nothing can supply it, and the item carries the indicator alone. The
gap is named here rather than filled with a placeholder name, because a placeholder in a specimen is
read as a decision.

**This record previously said an item carries no sync state, and that is withdrawn.** The argument was
that a column of forty items where one says "Sync failed" spends the design's attention on a fact the
person came to the library to act on rather than to diagnose, and the cost of withholding it was that
a failed playlist is invisible until somebody opens it. Both halves were reasonable and the decision
was wrong, because it was a decision about a component this screen does not own. The sync line is the
header's, it has its own place in the block, and a gallery of headers draws it because that is what a
header is. The cost that was named is now paid for: a shelf does carry "Sync failed" forty times over,
in `--tone-failed`, on a line under the name. That is the header's answer to the same question and this
screen inherits it rather than answering it again.

**This record previously said an item carries no equalizer strip, and the reason it gave was false.**
The reasoning was that "a track belongs to every playlist that references it, so three rows of one
person's shelf could animate for a single track", and the outcome, no strip, was right. The reasoning
was wrong: playback is per client and `data-state` is a single value, so exactly one playlist is the
playing one and at most one item can carry a strip. What is true is arithmetic and arrangement: the
strip solves `7n - 4` against the artwork's content box, a 96px cover gives exactly 14 bars, and the
card's square cover gives 51.4 and cannot carry one. So the strip is on the one playing item and on
no other, and the equalizer's own note is that the strip is the one place that says what is playing,
which matters more here than it did, because now every item carries a play button and the strip is
what distinguishes the one that is actually playing. The reasoning is corrected rather than the
sentence deleted, because a wrong reason that produced a right answer is how the next reader
reintroduces the answer without the reasoning.

**No search, no sort, no filter, no pagination.** Search is a permanent non-goal in the glossary and
the page size is `PageQuerySchema`'s default of 50, which is the API's business. The consequence is
that a shelf of more than 50 playlists is a shelf this screen cannot show all of. That is recorded as
a known limit rather than solved by inventing the control the glossary has ruled out.

## The header

**A quiet title and one control.** "Playlists" at `--text-2xl` on web and `--text-lg` on mobile,
because the type scale names that step for screen titles on mobile and this is one. The add control
is the same 36px box in both, with a 44px target around it on mobile, so a control looks the same on
both platforms and only its target differs.

**The add control carries a `plus` beside its label, and the glyph is `aria-hidden`.** `.btn` already
had `display: inline-flex` and a `--space-2` gap, so the control was built for a mark and had none on
it. It is `--icon-sm` and not `--icon-md` because the label is `--text-sm`, which is the pairing the
menu items already use: at `--icon-md` the plus's ink is 13.4px against a 9.84px cap height, or 1.36
times the height of a capital in the word beside it, and at `--icon-sm` it is 10.7px, or 1.09. The same
argument [the share indicator](../components/playlist-header.md) makes about standing beside a name,
and the same answer: the mark is a mark on the label, not a peer of it. It is hidden from the
accessibility tree because the button already says what it does, so without that a screen reader reads
"plus Add a playlist" and the word is the label. The control costs 24px of width for it, 128.4 to
152.4, and the pin had to gain the glyph: see [the icons record](../icons.md).

**No playlist count in the header.** A count of playlists is a standing total rather than a fact about
a row, and the system has a rule that a figure spent on a standing total is attention taken from the
list.

**The word "Add a playlist" appears twice on the empty screen, once in the header and once on the
shelf.** That is duplication rather than an oversight: the header's control is chrome and is there in
every state, and the shelf's is the invitation, and on an empty screen it is the only thing there is
to press. The two never coexist with a list, so at no width does a person choose between two controls
that do the same thing.

## The empty shelf

A different component from the playlist empty state, and not a variant of it. That one's action is
`Sync now`, because a playlist that exists and has no tracks is a playlist that has never been synced;
this one's action is `Add a playlist`. Drawing the other would tell a person with no playlists at all
to sync something. It has its own
[record](../components/empty-shelf.md), and it is drawn at both widths on the library's specimen.

## The add dialog

A 400px centred dialog on web and a full-width sheet on mobile, over the one scrim token, with the
single field `CreatePlaylistInputSchema` takes. It has its own
[record](../components/add-playlist-dialog.md) and its own specimen, because the states a person reaches
by doing something to the field are not states a person reaches by arriving on this screen.

**The body says nothing is downloaded until a sync, because a sync is manual in v1.** The first draft
said the playlist "syncs once you add it", which the glossary makes false. `POST /playlists` is a
`sendNotImplemented` stub, so every drawing of this dialog is of a route that does not answer yet,
which is a fact about the server rather than about the component.

## The player bar is not drawn at rest, and that corrects another record

**There is no bar at rest.** The bar appears the moment a track starts and takes 97px docked, which is
the **98px** the [player bar record](../components/player-bar.md) measures, less one pixel because the
docked bar's bottom border is against the screen edge where a border draws nothing. The player bar
record said the bar is persistent and therefore "cannot be absent the way the header's transport is",
and answered the question it was asked with a bar holding an empty identity and a disabled play. This
record withdraws that answer: the landing screen is the one screen where a bar with nothing in it
costs the most, and the person using it has not yet chosen anything to play. The player bar record is
corrected in place, with the reason, rather than left contradicting a screen that is drawn.

**What the arrival costs is named rather than argued, and the cost changed shape three times.** At 390
the header is 56px, so the content area is **788px** and the grid's row pitch is 235.1px, which is 3
whole rows: **six cards at rest**. With the bar docked the content area is **691px** and it is 2 whole
rows, so **four cards**. The bar therefore costs two of the six cards the person could see, which is
the same shape as before at a different unit: when a card was 436.8px the bar cost 0.21 of a card, and
when items were 88.8px rows it cost a whole row. Nothing about the bar changed; the unit the screen
counts in did, three times, and each time the answer had to be re-measured
rather than carried over. The decision the cost belongs to is still the one above: no bar at rest,
because a bar of dead control on the landing screen costs 98px of the same screen for a play that
cannot act.

**The 610px budget in the ticket is the detail screen's and does not apply here.** 610 is 844 less a
136px playlist header and a 98px bar. This screen has the first as its items rather than above them,
and no bar at rest. Its content area is 788px, which is 178px more than the number the ticket set, and
taking the ticket's figure would have understated this screen's room by more than a quarter.

## Signed out, on mobile only

The state replaces the content area rather than sitting over it, because signed out no other resource
in the app is reachable and there is no list behind it to dim. Web has no signed-out state at all and
that is not an omission: the edge authenticates the browser before the app exists, so the SPA is only
ever loaded authenticated.

**It is a sentence and no control, and the sentence says why.** The server fails closed with
`401 unauthenticated` when the edge headers are missing, and ADR 0003 records that the app runs no
login. A button here could only open a browser to a flow no ticket, contract or ADR has decided, and
the mobile client has no config for an authentication URL today. So the state names the situation and
stops: "PlayLiberty could not confirm which account you are, and there is no way to sign in from
inside the app." That is the design of the state, and the absence of the button is the design rather
than the gap.

## Figures, and the width each came from

|                              | at 1056, web                    | at 390, mobile                    |
| ---------------------------- | ------------------------------- | --------------------------------- |
| header                       | 78.4px                          | 56px, title only                  |
| the component                | the playlist header             | the playlist header               |
| item                         | 136px, 137px after the first    | not used                          |
| card, one per row            | not used                        | 436.8px, superseded               |
| card, in the grid            | not used                        | 172.2px wide, 223.6 or 247.3px    |
| the grid                     | not used                        | 2 columns, `--space-3` gap        |
| the header's own card        | not used                        | 468.8px, full-bleed               |
| cover                        | 96px                            | 140.2px, square                   |
| name                         | `--text-xl` semibold            | `--text-lg` 20px semibold         |
| the name's column, at rest   | 848px                           | 112.2px of text                   |
| the name's column, playing   | 784px                           | 112.2px, unchanged                |
| the share indicator          | 20px, beside the name           | 20px, at the row's right edge     |
| actions column, at rest      | 72px                            | not used: the band is the picture |
| on the picture, at rest      | not used                        | the play, 48px of 108.2           |
| on the picture, playing      | not used                        | the pause, the same 48px          |
| the transport                | 136px                           | not drawn                         |
| the top left of the picture  | not used                        | the shuffle, 32px, inset 24px     |
| the two controls' centre     | not used                        | one axis, 40.8px from the left    |
| below the cover              | not used                        | not drawn: no overflow on a card  |
| the control band             | not used                        | 80px, 57.1% of the cover          |
| the band at one card per row | not used                        | 80px, 24.7% of a 324.4px cover    |
| the status line              | under the name, with a time     | count left, state right, 1 or 2   |
| the status line's two facts  | state, time, count, 3 lines     | 148.4px needed, 140.2px of column |
| the status line's alignment  | the header's `.meta` is centred | `baseline`, 0px apart             |
| the separator                | a middot                        | none: the gap is the separator    |
| the gap on a full line       | not used                        | 8px, the floor                    |
| the gap on the emptiest      | not used                        | 52.62px                           |
| the count's unit word        | `tracks`                        | kept, wraps on a four-figure one  |
| the picture that is the link | not used                        | 63% of a resting card, was 27%    |
| the add control              | a labelled button, 152.4px wide | a 56px FAB, no visible word       |
| the add control's position   | in the header's right           | bottom right, --space-4 inset     |
| the add control, bar docked  | not applicable                  | 113px up, clearing the bar by 16  |
| the add control's clearance  | not applicable                  | 88px, 185px with the bar          |
| the add control's glyph      | `plus` at --icon-sm beside text | `plus` at --icon-lg, 50% of it    |
| the add control's tier       | not applicable                  | `--z-sticky`, under the scrim     |
| content area                 | not a phone budget              | 788px at rest, 691px with the bar |
| whole items above the fold   | not a phone budget              | 6 cards at rest, 4 with the bar   |
| rows above the fold          | not a phone budget              | 3 at rest, 2 with the bar         |
| empty shelf                  | 220px tall                      | 244px tall                        |
| add dialog                   | 400 by 255.6px                  | 388.4 by 234.8px, as a sheet      |
| signed out                   | not drawn                       | 356.4 by 180px                    |

**Every text pairing here is one the token set already declares.** The name is `--ink` on `--bg` at
15.94:1, the count is `--muted` on `--bg` at 6.18:1, the dialog's heading is `--ink` on
`--surface-raised` at 13.42:1 and its body is `--muted` on the same at 5.20:1, the add button's legend
is `--bg` on `--accent` at 5.85:1, and the row's focus ring is `--accent` at 5.85:1 on `--bg`. The
rows sit on `--bg` and not on `--surface`, which is the track list's own arrangement, so the two lists
in this product are the same object. The empty-state record calls its list `--surface` because that
component is drawn inside a `.panel` in its specimen, and a `.panel` is a specimen device rather than a
surface the product has.

**Truncation is on both arrangements now, and the grid made mobile far worse.** At `--text-xl` the
sixth item's 78-character probe name measures **923px** against a column of 848px at rest and 784px
while playing, so it is cut on web in both states. The item before it, 32 characters and 356px, is not.
On a card in the grid the name row is **140.2px**, of which the share indicator takes **20px** and the
row's own `--space-2` gap takes 8px, leaving **112.2px** of text: some **ten characters** at
`--text-lg`, where one card per row fitted 27 and the longest fixture name was cut at 296px. "Late
Night Jazz for Overthinking" at 32 characters and 356px is cut to 112.2px. Measured across the six
fixtures, **four of the six names are cut**.

**Those figures were wrong for several turns and are corrected here rather than quietly.** The records
said the column was 112px "of which 28px is the share indicator", so every truncation figure derived
from it was computed against 84px of text. Measured, the indicator is **20px**, which is
[the header's own figure](../components/playlist-header.md), and the text column is **112.2px**. The
ten characters were right and the derivation printed beside them was not: there was never an 84px
column and never a 28px indicator.

**No type step recovers more than three characters of that**, which is the measurement that makes it
a cost rather than a missed opportunity. The step this arrangement takes is to `--text-lg` 20px, which
is 10 characters of the 112.2px rather than the 8 at `--text-xl`, and `--text-sm` 14px would be about 13.
So a shelf of forty playlists in this shape shows ten characters of each name, and that is what six
cards above the fold instead of one is being paid for.

**The card's height cost the sync line, was given most of it back, and has since given a little of it
up again.** With the header's full sync line under the name a card was 329px to 345.2px tall, because
the line wrapped to two, three or four lines against 16.2px unwrapped and the card's height depended
on which playlist was in it. Pairing the state with the count made it a constant **223.6px** on all six,
and putting the two at opposite ends has given back **23.7px** of that: cards are now 223.6px or
247.3px depending on whether their count and their state together exceed the line. So the grid has
neither a constant card height nor a constant status line, and that is recorded here rather than the
earlier claim standing, because a grid of cards of different heights cannot be scanned in columns and
that was the argument for pairing the two facts in the first place.

**A name long enough to be unusable is cut on the card much earlier than on the item**, which is the
cost of leading with the artwork and is a cost in characters rather than in pixels. 27 against 64 is
the whole of it.

**A note on measuring this file, because it is the third time here.** The formatter wraps a long text
node, so the probe name in the markup carries a newline and eighteen spaces that the browser collapses
and a script reading `textContent` does not. Its `textContent` is 96 characters and the name is 78.
The rendering is correct and the 923px above is the rendered width; the figure is recorded because
anyone measuring this file by reading the markup gets 96 and is wrong. The same wrapping is what made a
`data-pair` unverifiable in the header specimen, where the consequence was a ratio nobody was checking.
Here it is a character count, which is the smaller of the two problems this formatter has caused in
this tree.

## What is not drawn

The owner of a shared playlist, by name, for the reason above. Search, sort, filter and pagination.
The equalizer strip on a card, which its own size cannot carry. **The queue panel this record used to list
here does not exist and is not going to**: the
[playlist detail's record](./playlist-detail.md) resolved it, the answer being that the track list is the
queue, so there is no panel and no trigger to open one, and the three records that pointed at a panel on
the [player bar record](../components/player-bar.md) were pointing at nothing. The library has no list of
its own on this screen, so if a queue ever needs a panel it will be built then, against a case that has
shown it is needed. The playlist detail, which is
[`17-design-the-playlist-detail`](../../tracker/tasks/17-design-the-playlist-detail.md).

**Two things this record previously listed here are now drawn, and saying so is the point of the
list.** A sync state on an item and a strip on a cover were both recorded as deliberate absences with
reasons, and both are now present because the item is the header rather than a smaller component. The
absence of a sync state was a decision this screen should not have been making; the absence of a strip
was a right answer reached by a false reason. One of those is a boundary and one was an error, and the
difference is only visible because the component it belonged to turned out to be somebody else's.
