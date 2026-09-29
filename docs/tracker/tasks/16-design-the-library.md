# Design the library screen

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Outcome

The library is drawn at both widths. `docs/design/screens/library.html` and
`docs/design-system/screens/library.md`, plus a row in `docs/design/index.html`, three rows in the map
in `docs/DESIGN.md`, and two new component records. Two gate checks were added, both proved by putting
the fault back.

**Three of the ticket's own premises were wrong, and the record says so rather than working around
them.**

**The "shared by" line has no data source.** Ticket 13 says `ownerAccountId` and `GET /me` supply it.
`ownerAccountId` is a UUID, `GET /me` returns only the signed-in account, and `GET /accounts` is a
`sendNotImplemented` stub. So a shared row carries the indicator and no name, and the gap is named in
the record. No ticket was written for the missing lookup, which was a deliberate choice rather than an
oversight: the indicator already says the row is shared, and a contract ticket for a display name is
not this ticket's to open.

**Ticket 18 landed after this one was written.** `access` and `hasShares` are on `PlaylistSchema`, the
row reads both, and the library is the first place `access` varies row to row. The ticket never
mentions them and the record spends more on them than on anything else the ticket asked for.

**The phone budget is the detail screen's.** 610px is 844 less a 136px playlist header and a 98px bar.
This screen has neither. Its header is 56px, since the add control became a floating button, and there is
no bar at rest, so the content area is **788px**, which is 178px more than the ticket set and would have
understated this screen's room by a third.

**Three things the ticket expected and the measurement disagreed with, recorded rather than forced.**

**The item is 136px on web and a 172.2px card in a two-column grid on mobile, and the
ticket's two heights were the right shape for the wrong component.** It said a row at the wide
reference and the same row at 390 are two heights, which is true, and it meant one component at two
widths. What is on the screen now is one component at two arrangements, and those differ by
12.6 times rather than by a fraction. Inventing a single height to satisfy the expectation
would have been exactly the measured-by-taste failure the
project forbids.

**The web arrangement does have a truncation case, and did not before.** The probe is a 78-character
name, 923px at `--text-xl` against a column of 848px at rest and 784px while playing, so it is cut in
both states. At `--text-md` in a 64px row it was 615px against 890.95px and fitted whole. A card's
column is 324.4px, which fits 27 characters at this size, so mobile cuts far more names than web does.

**The add control became a floating action button on mobile, and the header lost 12px to it.** The
header is now 56px and carries only the title, so the content area is 788px rather than 776px. The
button is a 56px circle inset `--space-4` from the bottom right, sitting 113px up when the 97px bar is
docked so it clears the bar by 16px, and it covers **32.5% of a card's width**. It has no visible word:
the name is on `aria-label`, and the reason that is affordable is that the glyph is a plus, which is
the one mark that needs no learning. An extended pill carrying "Add" was measured at 98 by 56px, which
is **56.9% of a card's width**, and rejected for it.

**What it costs is scroll, and the clearance is the number worth remembering.** A control that does not
scroll with the grid needs room below the last card or it hides that card permanently: **88px** at rest
and **185px** with the bar docked, which is 23.8% of the content area paid for a control occupying
15.7% of the width. At the resting fold the button covers no card content at all, measured by
intersecting its box against every card's picture, name and status line; it sits over the last card's own
background. As the grid scrolls it necessarily crosses cards, which is the shape's cost.

**The glyph's size was re-decided rather than carried, and the standard sizes belong together.** The
header's button put the plus at `--icon-sm` beside a `--text-sm` label, a pair the icons record argues
for. With no label there is no pair: 16px in a 56px circle is 29% of the box and reads as a small mark
in a large one, so it moved to `--icon-lg` 28px and 50%. The 48px box that was also on the table would
have left that same 28px glyph at 58% of itself, which is why 56 and `--icon-lg` go together. All four
faults were proved by putting them back: dropping the bar clearance puts the button 81px inside the
bar, a 48px box puts the glyph at 58%, and `--icon-sm` puts it at 29%.

**There is no shadow token in this system, so the button brings its own ground**, for the same reason
the shuffle chip does: it sits over artwork and a card's picture. It is `--accent` on `--bg`, the 5.85:1
the add button's legend already had, so losing the word cost nothing and the glyph inherited the
pairing. It sits at `--z-sticky`, and **that was `--z-overlay` first and is corrected by a fault I
found by drawing it.** Three requirements meet at `--z-sticky`: above the grid, below the bar at
`--z-player`, and below a dialog's scrim at `--z-overlay`. A dialog is what this control opens, so
`--z-overlay` puts the button **in front of the scrim that dims it**: measured with the sheet removed
so the scrim is the only thing that can be on top, at `--z-sticky` three sample points on the button
all hit the scrim and at `--z-overlay` all three hit the button. The add-dialog frame now draws the
button, because that is what the screen looks like at that moment.

The empty
shelf's frame gets no floating button, because its own action is a full-width button in the middle and a
floating copy would put the action twice on the one screen where a person has seen neither.

**A docked bar is 97px, not 98px**, because its bottom border is against the screen edge. The arrival
costs two of the six cards above the fold rather than a whole item, and the unit has changed twice
under this screen, so the figure had to be re-measured rather than carried over each time: 788px holds
six cards in the mobile grid and 691px holds four.

**Three components were asked for and two exist.** The empty shelf and the add-a-playlist dialog are
real components and have records. "The player bar with nothing playing" is not a component, because
the bar is absent at rest rather than present and empty, so the player bar record is corrected in
place instead. The shelf is drawn at both widths on the screen's specimen and has no specimen of its
own, since a component with one arrangement and no states of its own has nothing to add by being
filmed twice. The dialog does get its own, because the states a person reaches by doing something to
the field are not states a person reaches by arriving on the screen.

**The bar being absent contradicted a record and the record was corrected rather than the screen
working around it.** The player bar record said the bar is persistent and "cannot be absent the way
the header's transport is", and answered with an empty identity and a disabled play. That claim is
withdrawn in place, with the reason and with the cost, and the persistence argument is scoped to
"once playback exists" rather than deleted. Check `2p`'s reason for preferring `disabled` to merely
inert still stands for a control that is genuinely unavailable rather than absent.

**A playlist item is the playlist header, and saying that out loud reversed four of my own decisions.**

The first version of this screen drew an 88.8px row carrying the header's identity block alone at
64px and `--text-md`: its own cover, its own name line, its own count, its own share indicator, five
class names of its own, and no sync line and no actions. Treating the screen as a gallery of headers
rather than a list of small rows is a different component, and it is the one the ticket meant.

**Nothing caught the duplication, and the reason is worth keeping.** Five new class names are invisible
to anything that compares file names, and the header's identity block had **no record at all**: every
decision about it lived as a comment inside a 3794-line stylesheet, so a second consumer could not find
them. The block now has [its own record](../../design-system/components/playlist-header.md) and all 54 of
the header's own rules moved to `specimen.css` beside the equalizer strip. The move was proved
behaviour-preserving: the header's 136px, 136.8px, 96px cover, 848px and 784px name columns, 72px and
136px action columns, 14 strip bars, and the card's 468.8px and 356.4px were measured before and after
and every figure is identical.

**The duplication had already produced the exact fault the header documents.** Its comment reads "flex: 0
1 auto and not flex: 1, which is the mistake this line made first", because a growing name pushes the
indicator to the far edge. My row had `flex: 1`. It looked right only because the count lane beside it
happened to bound the row.

**It also caught a row with no indicator at all.** The web list's first row had none, which is the
omission the header's name-line comment predicts: "one card would eventually omit it and its indicator
would be truncated away with the name, silently". A row is a card, and `access` is on every playlist, so
all six items carry one now.

**Four decisions reversed, and two of them for the wrong reason.**

1. **A sync state is now on every item**, because the sync line is the header's and this screen draws
   headers. I had recorded its absence as a deliberate trade, with the cost named: a failed playlist is
   invisible from the library until somebody opens it. That was a decision this screen had no business
   making, and the cost is now paid for in `--tone-failed` forty times over.
2. **The equalizer strip is now on the one playing item**, and the reason I gave for withholding it was
   false. I wrote that "a track belongs to every playlist that references it, so three rows of one
   person's shelf could animate for a single track". Playback is per client and `data-state` is a single
   value, so at most one item can carry a strip. The outcome was right and the reasoning was an error,
   and it is corrected in place rather than deleted, because a wrong reason that produced a right answer
   is how the next reader reintroduces the answer without it. A 96px cover gives exactly 14 bars, and
   the strip now matters more rather than less, because every item has a play button and the strip is
   what says which one is playing.
3. **The count's lane is withdrawn.** The header's count has no lane, and a gallery of headers draws
   the header's count, so the 77.06px lane and the alignment work that went with it are gone. Drawing
   the word "tracks" rather than hiding it in a visually hidden suffix survives, and it now costs
   nothing, because the header never spent the 33.06px in the first place.
4. **The share tooltip reveals on hover again.** I had hidden it on the basis that forty hover targets
   is worse than one. That is true and the conclusion was wrong for the same reason as the sync state:
   the tooltip is not the consuming screen's decision to make.

**Two things the component forced, neither of which was a choice.** An item cannot be a link, because
it now holds three buttons and a button inside an anchor is invalid; so the cover and the name are
links and the cover's carries no accessible name and no tab stop, so one link is announced per item. And
on the card the cover cannot be the link either, because the card puts two buttons on the picture, so
the picture stays a `div` and the link is a sibling of the controls inside it, which was checked by
hit-testing rather than assumed.

**The mobile arrangement is the header's card in a two-column grid, and six cards clear the
fold.** The card is 172.2px wide and 223.6px tall with a 140.2px square cover, in a 788px content area,
so three whole rows: six cards at rest and four with the bar docked. The price is the name, and it was
measured before it was paid: the name row falls from 324.4px to 140.2px, of which the share indicator
takes 20px and the row's own 8px gap takes 8 more, so 112.2px of text and about ten characters at
`--text-lg` where 27 fitted at `--text-xl` on one card per row.

**The card drops or moves six things, and all six are this screen's decisions rather than the
component's.** They are declared in the screen record and not in `specimen.css`, and the header record
names them so the component's own card is untouched: no overflow at all, the name a step down, the sync
line paired with the count, no transport, the shuffle moved to the top left of the picture, and both
rows of the card ending on the same edge.

**Dropping the transport is a cost this ticket did not ask for and the record names rather than
absorbs.** The card's band now holds one control in both states, the header's own play becoming its own
pause, and nothing moves when a playlist starts: the band keeps its 16px padding and the play stays at
16px from the picture's edge. What is given up is that **the pause glyph is the entire signal of what
is playing** on a card, because a card at 172.2px has nowhere to put the strip that says it on web and
no room for the two steps. That is 48px of button on a shelf of six, and it is the price of the grid.

**It also bought the alignment the shuffle needed, and finding the right one took two wrong answers.**
With the shuffle on the right it was inset 4.2px, derived from the transport's right edge being 4.2px
from the picture's, so that the shuffle and the `track-next` icon shared an x. With the transport gone
that derivation pointed at nothing, so the chip moved to the top left. I first inset it by the band's
own `--space-4`, which puts both left edges at 16px and is _not_ an alignment: the chip is 32px and the
play is 48px, so equal lefts put the centres 8px apart, half the difference in widths. Then I read half
the difference as `--space-1`, put the inset at `--space-5`, and wrote a comment arguing that the exact
figure of 24px must be wrong because it would centre the chip on the play rather than on the picture.
Both halves of that were backwards: 24px is what centres the chip on the play, the play is not centred
on the picture either, and the play does not move. The answer is `--space-6`, 24px, measured at **0px**
apart on all six cards resting and playing, with `--space-4` at 8px and `--space-5` at 4px as the two
proved faults. The old 13.4px and 1.6px figures are kept in the record because they were measured and
sound for the drawing that existed.

**And a measurement of mine was wrong twice in one exchange, which is recorded because the pattern is
the lesson.** Both wrong answers were confident and both were arithmetic I did in my head rather than in
the browser: the 8px came from measuring and I read the shared left edge as the goal instead of asking
what the eye aligns on, and the 4px came from a subtraction I did not check. The project's rule is that
no layout claim comes from a screenshot or from mental arithmetic, and the first answer I took from a
screenshot was wrong by exactly the amount a centre-versus-edge confusion would predict.

**Pairing the sync state with the count is the one of those that took four measurements to settle,
and it withdrew a cost this ticket had already accepted.** I had written that a failed playlist is
invisible on a phone until somebody opens it, and paid it knowingly. The state does not need a line of
its own to be visible: `128 · Up to date` says the same thing about whether to act as
`Up to date · Synced 2 days ago · 128 tracks`, and it fits. The card is 223.6px against the 247.3px the
two facts came to on two lines and the 329px to 345.2px the header's full line came to, so the height
is now constant across all six cards, which is worth more to a grid than any of the pixels. The count
comes first because that is the header's own order, name then state then count, so a reader arrives at
the figure and the state qualifies it.

**What it costs is the count's unit word, and that was then given back, and the sequence is the useful
part.** Dropping the noun fitted the line: at the worst case, "Sync failed" against "1284 tracks" in
140.2px, the header as drawn needs **168.3px**, suppressing the dot needs **153.3px**, `--space-1`
needs **145.3px**, the whole count at `--text-xs` needs **140.6px** which is over by **0.4**, and
dropping the unit needs **127.3px** and fits. Every one of those measured the two facts **as if they
were adjacent**, which is what a middot line does. Putting the count and the state at opposite ends of
the line removes that assumption, and then the two stop competing at all: the state holds its size and
the count yields, so the noun drops to a line of its own when the two together will not fit. At
opposite ends "1284 tracks" is **74.66px** and `Sync failed` with its dot is **73.76px**, so
**148.42px** of a 140.2px column, over by 8.22, and dropping the count's number to `--text-xs` still
needs **143.64px**, over by 3.44.

**So the card is no longer a constant height, which is a reversal of the claim pairing the two facts
bought.** Measured on the six fixtures: four cards at **223.6px** and two at **247.3px**, the two being
the ones whose count and state together exceed the line. Three things fit and the choice was between
dropping the dot, dropping the noun, or letting the noun wrap; it wraps. The count's number is `flex:
none` inside the count, so what drops to a line of its own is the noun and never the figure, because a
track count that broke between its digits would be a lie rather than a truncation. All three faults
were proved by putting them back: `flex: none` on the count removes the wrap and returns the card to
223.6px, `align-items: center` puts the baselines **1.6px apart**, and dropping the unit again moves
the card to 223.2px.

**Putting the state at the right is a scanning decision, and it is why the middot went.** The three
words are 57px, 70.8px and 73.76px wide and only right alignment makes the longest of them read as a
column edge, so a `Sync failed` sits at the same x on every card and a shelf of forty can be read for
the fault. The middot went with it: a separator between two things at opposite ends would be a third
thing floating in the middle of the line. The `--space-2` gap is now the separator and it is a floor
rather than a figure, measured from 8px on a full line to 52.62px on the emptiest. The one case that
needed a rule of its own was the card with no count, where `space-between` put a lone item at
flex-start and put its `Sync failed` at the left edge, breaking the column on exactly the card most
likely to have a fault; the state carries `margin-inline-start: auto` when it is an only child, which
was proved by removing it and getting a 66.44px gap.

**Both rows of the card now end on the same edge, and that reverses the header's own name-line
decision.** The card's name row is `justify-content: space-between`, which is what
[the header record](../../design-system/components/playlist-header.md) argues against: "a growing name
pushes the indicator to the far edge, which is a different design". It was measured before being done
and the cost is **nil**: the name's column is 112.2px either way because the indicator is **20px** and
the row's own 8px gap are the same in both arrangements, four of the six fixtures are cut with the
indicator at the far edge exactly as four are cut with it beside the text, and the fault that section
predicts, an indicator truncated away with the name, cannot happen because `.share` is `flex-shrink: 0`.
The header's reason does not transfer to a card in a column and the header record now says so in place.

**And the records had the indicator at the wrong size for several turns.** They said 28px, which is
how the 112px text column was derived; measured, the indicator is **20px** and the text column is
**112.2px**, with 140.2 less 20 less the 8px gap. Every truncation figure derived from "112px of which
28px is the indicator" was off by 8px in the reader's favour and the number was wrong.

**The status line is baseline-aligned, and it works by a coincidence that nothing checks.** A flex item
with no baseline of its own has one synthesized from its border box, and `.state`'s first flex item is
the dot, a 7px box with no text in it, so the baseline flexbox picks for the state is the dot's bottom
edge. Inside a 16.2px `.state` that edge is at 11.6px from the top and so is the word's own baseline.
That equality is why `align-items: baseline` works with no correction, and measured on all five cards
carrying both facts the number, the separator and the word are each 14.4px from the top of the line,
**0px apart**. Change the dot's height or the line height and the word lifts by the difference, and no
width changes and no assertion fails. That is the same class of fault as the header's own missing
indicator, and it is recorded as a known fragility rather than asserted.

**Two faults in this arrangement were found by looking, and neither was in the component.** The band's
own box swallowed taps: it is a div 80px tall over the bottom of the picture and a div receives events
across all of it, so hit-testing a 10 by 10 grid of points on a resting card found 27% of the picture
was the link, 18% was the control, and **55% was the band's empty padding**. `pointer-events: none` on
the band with `auto` on the controls inside it takes the dead area to **0%** and the link's share to
63%. No measurement of the card would have found this, because the card has no link under it and the
link is this screen's. The second was the state's own size: `.state` inherits `--text-xs` from `.meta`
and this line has no `.meta` in it, so it rendered at the card body's `--text-sm`, measured 83.6px for
"Sync failed" against the header's own 73.8px. That is 9.8px of the 12.9px the line had left, and it
was a fault in the consumer rather than in the block, which is why the fix is a `font-size` on the
screen's own line.

**And one measurement of mine was wrong in a way worth recording, because the correct answer was zero.**
Seeing the baseline-aligned line in a downscaled screenshot, I read the state word as floating above the
number and added a 3.5px correction. It was already exact: 0px apart, as measured. The 3.5px correction
made it 3.5px wrong. The probe that produced it was itself faulty, because a baseline probe inserted
inside an `inline-flex` becomes a flex item, has `vertical-align` ignored, and so measures its own
synthesized baseline rather than the text's. Reading a scaled screenshot is not a measurement, and the
rule this tree keeps is that no layout claim comes from one.

**Shuffle is on every item, which is the price of exact reuse**, and the cost is named rather than
paid quietly: forty `aria-pressed` toggles for one player's shuffle.

**The three overflows are gated on `access`, and the glossary settles it.** An owner holds all four of
the header's items, a `write` collaborator holds `Sync now` alone, and a `read` collaborator has no
overflow button at all rather than one with nothing in it. The two collaborator items are drawn with the
same glyph and different menus, which is the honest picture of a permission model the indicator is
coarser than. They are drawn **on the web item and one per arrangement**, because the item's menu
opens downward, 170px against a 137px item, so two at once would overlap, and in the product opening
one closes the others. That last part moved: they were on the card while a card still carried a menu,
and a card no longer carries one at all, since rename, delete, managing shares and syncing on demand
are all available from inside the playlist on a phone. The access gating is a web question now.

**Three gate changes and one script change, each proved by restoring the fault.** Check `2` now reads
`specimen.css` as well as the specimens, because the shared rules went there and a hex typed into it
was previously invisible to the check that exists for exactly that; a planted hex now fails. Check `2l`
reads the host box from the specimen or from the shared stylesheet, resolving a `var()` fallback,
because its input moved, and its reader tries a consumer's override **first**, because reading it last
would measure a wrong cover against the shared default and pass; a 100px cover now fails with the pitch
named. Check `2r` is new: every custom property a consumer sets on a class `specimen.css` also rules has
to be one that stylesheet reads, because a wiring between two files fails in a way a duplicated rule
cannot. And `splice-morph-block.mjs` now splices the strip's **markup** as well as its CSS: the CSS was
spliced and the 33 frame groups were hand-pasted, so the geometry a control actually draws was the one
thing in it that could drift. The extension is a no-op on the four existing files, all 33 of whose
strips are byte-equal to the generator, and a file declaring a morph with no frame groups now fails the
run rather than drawing a play triangle on a playing button forever.

**The add control carries a `plus`, and the pin had to gain the glyph for it.** `.btn` already had an
inline-flex row and a `--space-2` gap, so the control was built for a mark and had none on it. The pin
held `minus` and not `plus`, which is the shape of an omission rather than a decision: nothing in the
tree drew an add control with anything on it until this screen did. `plus` went into `PINNED_ICONS`
from `@tabler/icons` 3.48.0 verbatim, and the cross-check that it is the right version is that its
second path is byte-identical to the `minus` already in the pin. In the header's button it is at
`--icon-sm` because the label is `--text-sm`, which is the pairing the menu items use: at `--icon-md`
the ink would be 1.36 times the cap height of the word beside it. It is `aria-hidden`, so the button
still reads "Add a playlist", and it carries no optical correction because a cross is centred, which
was confirmed by rasterising it at 24 units and reproducing the `minus` and `check` rows of the icons
readout to the digit. **On the mobile floating button the same glyph moves to `--icon-lg`**, because
that one has no label beside it and the pairing the size was chosen for no longer exists: 16px in a
56px circle is 29% of the box, 28px is 50%. The pin is unchanged by that, because a pin records the
glyph and not the size a screen draws it at.

**The mobile list is two columns, and three was asked for and is not available.** Two columns put six
whole cards above the fold where one card per row put one, at a cost of about 17 characters of name:
the name row falls from 324.4px to 140.2px, of which 20px is the share indicator and 8px the row's
gap, so 112.2px of text and ten characters at `--text-lg` where 27 fitted. Three columns overruns its
own track by 43px, and its
control band would be 100.9% of a 79.33px cover: taller than the picture it sits on.

**The grid forced the controls off the picture, and the failure mode is the reason it is worth
recording.** At 172.2px the cover has 108.2px inside the band's own padding and the play, the shuffle
and the overflow together need 168px. They do not fit, and it is not graceful: the overflow sits past
the right edge of the picture and is clipped by it, and on the one card that is playing the transport
and the action row need 256px, which overruns the card by 85px and lands on its neighbour. An
intermediate version kept the play and the shuffle in the band, which are 104px of 108.2px, and put the
overflow on the surface below. That version is superseded: the card has no overflow and its shuffle is a
32px chip on the picture's top right, which is 5.2% of a 140.2px cover where a second scrim band would
have been 192px.

**A superseded alignment, kept with its figures because it was measured and it was right for the
drawing that existed.** The shuffle was on the picture's top right, inset 4.2px, derived from the
transport's right edge being 4.2px from the picture's, so that the shuffle and the `track-next` icon
shared an x on a card that is playing. Measured, they were 13.4px apart before that inset and 1.6px
after, and the 1.6px is twice the 0.8px a 1px border renders at in this environment, the transport
sitting 0.8px right in flow and the chip 0.8px left positioned against the picture. The stylesheet
carried 4.2px and not the 3.4px that would align them in this rendering, because baking a snapping
artefact into a stylesheet is how a sub-pixel error becomes permanent. The chip's x was 103.2px from
the picture's left edge on a resting and a playing card alike, so the shuffle did not move when a
playlist started. All of that was true and all of it was about a control the card no longer draws.

**Three faults in this exchange were mine and all three were caught by looking, not by reading.** A
build script emitted `{ADD_ICON}` literally into three buttons because one string was not an f-string. A
card transform cut `.mart` out and never put the cover back, so one candidate was a card with no
picture on it. And the same transform left `.action-row`'s opening tag on the shuffle half, so every
following card nested inside the first and the grid came out with a single 998px child. Each is now
asserted in the generator rather than left to review.

**And one claim of mine was measured wrong and had to be withdrawn.** I reported that the two-up
controls fit, from a probe that tested them against the card's width rather than the cover's, and wrote
that conclusion into the prototype. It is corrected there and in both records.

**A real bug, found by looking rather than by measuring.** The dialog was drawn at `--z-base`, which
is 0, over a scrim at `--z-overlay`, which is 20, so the scrim painted on top of the dialog it was
dimming. Every measurement of it was correct: size, position, contrast. A screenshot read as a dialog
that had been deliberately dimmed, which is a thing a designer might well have meant, so the drawing
was not wrong-looking. Check `2q` now holds the ordering, reads the dialog off `role="dialog"` and the
scrim off a class containing the word, and was proved by restoring the fault.

**The `--icon-md` versus `--text-md` argument is withdrawn, because the argument is gone.** It read:
cap height at `--text-md` is 11.25px and `user-share`'s ink at `--icon-md` is 17.55px, so on a 16px row
the indicator stood 1.56 times the height of a capital in the name beside it, where at the header's
24px it is 1.05 times, and 1.56 was the price of a legible distinction. There is no 16px name on this
screen any more, so the proportion is 1.05 everywhere and the price is zero. The measurement survives
in the header record; the decision it supported was a decision about a component this screen did not
own.

**Four gate checks, and the count is self-checking.** `3d` requires a screen record to name both
arrangements, attribute a measurement to each, and have a specimen; each of those three was proved by
removing it. The README's count is compared against the script's own headers, so adding a check means
extending a word table that stops at twenty-four, which is the friction the comparison exists for.

**What is deliberately absent, and the cost of each.** No search, sort, filter or pagination, so a
shelf of more than 50 playlists is a shelf this screen cannot show all of. No owner name on a shared
row, because the lookup does not exist. Nothing on a card for the fault itself: the card says `Sync
failed` and leaves it there, because the sentence that says what was not lost and offers the retry is
[the sync error's](../../design-system/components/sync-error.md), and a card is not a place to explain
anything.

**Two of this ticket's own "deliberate absences" were errors, and both are now drawn.** They are
listed above under the reversals: the sync state on an item was a decision this screen had no
business making, and the equalizer strip's reason for being withheld was false. Neither is deleted
from this record, because a wrong reason that produced a right answer is how the next reader
reintroduces the answer without it.

**Still unowned, and named in the record rather than absorbed.** `POST /playlists` is a
`sendNotImplemented` stub, so the dialog is drawn against a route that does not answer. The three share
routes are untouched, as ticket 18 also left them. The owner-name lookup for a shared row does not
exist. Every playlist's count is 0 in production until the first association writer lands, so the rows
are drawn from a fixture with real counts, as ticket 15 warned.

## Objective

Draw the library, the screen a user lands on. It is the list of playlists, it is the only entry point to
content, and it is where the player bar has nothing to play. It has a route on each client and is one
task, so one record carries both arrangements.

## Context

Settled in `13-settle-the-screen-inventory`: a screen is a surface a user reaches by route, and one
screen is one design task. The web route is `/` and the mobile route is the app root. The two
arrangements live in one record because the token layer is one value set consumed by both runtimes and
React Native cannot resolve `var()`, so the design system is already one system with two renderings.
Splitting a screen's design by client would contradict the thing the whole token layer exists to be.
The empty state record sets the pattern: one file, measured at 1014 and at 390.

**A record that carries two arrangements can be misread as one arrangement and a variant.** So the
record's first job is to name the two and keep them apart, and every measurement is attributed to a
width. That is a requirement here rather than a matter of taste, because the numbers differ and the
wrong one is not obviously wrong.

**The data is `GET /playlists`, scoped to the account, one page of `PageQuerySchema`'s default 50.**

**It is one list, not two sections.** A playlist shared to the account is in it, because the library is
the only entry point to content and a shared playlist has to be reachable. A shared item carries a
"shared by" line, which `ownerAccountId` and `GET /me` already supply. A second section would duplicate
the row and split an empty shelf into two meanings.

**Every row shows a count**, which is `trackCount` from `15`. That field's record says what it is not: a
total of associations, so a playlist of 300 with 290 still `pending` reads 300 and plays four songs.
Draw the row so that reading is not a promise, or record why it is one.

**The count reads 0 for every playlist until the first association writer lands.** `15` stores it in a
column on the playlist, and nothing in production writes associations yet: the sync, the manual add, the
remove and the orphan prune are all unimplemented stubs. So a row drawn from today's data is a row of
zeros, and the only honest way to design against that is to draw the row from a fixture with real
counts, not from the live shape. Worth knowing before the row is measured, because a count that is
always 0 is not a thing to lay out around.

**Three components this screen forces into existence, none designed.** The empty shelf: the playlist
empty state says in its own closing line that "the library with no playlists at all is a different
component with a different action", so it gets its own record and specimen rather than a variant of
the existing one. The player bar with nothing playing, which is the resting state of the screen a user
lands on and which the design record lists as not yet designed. And the add-a-playlist dialog, which is
hosted here and nowhere else.

**The mobile arrangement has one state the web arrangement cannot have.** Signed out, the app shows a
sign-in prompt, and it replaces the content area rather than sitting over it: no other resource in the
app is reachable, so there is no list behind it to dim. Web has no signed-out state at all and that is
not an omission, since Pangolin sits in front of nginx and an unauthenticated request never reaches the
SPA.

**No sidebar, no tab bar, no persistent chrome.** The page is a header and a list. The header's contents
are this ticket's to decide, and the obvious candidate is the add control, since creating a playlist is
a library action.

## Scope

- `docs/design/screens/library.html`: both arrangements, the empty shelf, and the bar at rest. A row in
  `docs/design/index.html` and a row in the map in `docs/DESIGN.md`.
- `docs/design-system/screens/library.md`, opening with the two arrangements named and kept apart, and
  attributing every measurement to a width.
- Three new component records with their specimens: the empty shelf, the player bar with nothing
  playing, and the add-a-playlist dialog.
- A row height per arrangement. A playlist row at the wide reference and the same row at 390 are two
  heights, not one height and a squeeze, and the record gives both.
- The mobile arrangement against the phone budget already in the records: a 136px header, a 98px bar,
  and 610px of content on an 844px phone, with the library's own row height subtracted from it.

## Do not

- Do not design the playlist detail. It is `17`.
- Do not add a sidebar, a top nav, a tab bar, a drawer, or anything persistent.
- Do not put a playable count or a "N ready" on a row. The count is a total and the field record says
  why.
- Do not design the queue panel. It belongs to the player bar record, and this screen is one of the
  places it can be opened from rather than a place it is designed.
- Do not redraw a shared component at a second width and call the result a variant. A component is
  specified once; a screen states which width it drew it at.
- Do not invent a route, a search field, a sort control or a filter. Search is a permanent non-goal and
  pagination is the API's, not a control this screen designs.

## Blocking edges

Blocked by `15-add-track-count-to-playlists`, since every row carries a count and a row with no field
behind it cannot be measured. That has landed, so the only thing standing between this ticket and
starting is itself.

## Verification

- `node docs/design/scripts/validate-design-tokens.cjs` passes. It needs no registration for the new
  files: `specimenFiles` walks `docs/design/` recursively, and the dead-link check reads
  `docs/design-system/` and the tracker recursively, so both new specimens and every new record are
  covered on arrival.
- Both arrangements are drawn, and the record attributes each measurement to a width. A reader who only
  reads the web half can tell it is half.
- Every state is drawn: the empty shelf, the populated list, the bar arriving, and the signed-out
  prompt on the mobile arrangement only. Each is listed in the map, and the shared three are specified
  once. **Rewritten during the work:** the item asked for "the bar at rest", and the bar is absent at
  rest rather than present and empty, so the state that exists is its arrival. The bar at rest as a
  component is withdrawn in the player bar record, with the reason, rather than left as an undrawn
  requirement.
- Every text pairing in the new specimens has a measured ratio and clears AA, computed rather than
  judged, as in every other subject in the record.
- `pnpm run build` and `pnpm run lint`.
