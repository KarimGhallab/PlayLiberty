# Design the playlist detail screen

Status: resolved
Labels: `enhancement`, `ready-for-agent`

## Objective

Draw the playlist detail, the screen the whole product exists for: the only place stored tracks become
audible. It has a route on each client and is one task, so one record carries both arrangements. It
composes components that are already designed, and its work is to arrange them, host two dialogs, and
cover the states a playlist can be in.

## Context

Settled in `13-settle-the-screen-inventory`: a screen is a surface a user reaches by route, and one
screen is one design task. The web route is `/playlists/:id` and the mobile route is pushed over the
library root. Both arrangements live in one record because the token layer is one value set consumed by
both runtimes and React Native cannot resolve `var()`, so the design system is one system with two
renderings. The empty state record sets the pattern: one file, measured at 1014 and at 390.

**A record that carries two arrangements can be misread as one arrangement and a variant.** So the
record names the two and keeps them apart, and every measurement is attributed to a width. Three facts
below are true of one client and not the other, and a merged record is exactly where they get lost, so
each is called out where it belongs rather than left to be inferred.

**Three of the four states already have designed components and one does not.** Never synced is the
empty state, which is `lastSyncedAt` null. Syncing is the header's busy form plus the sync summary's
in-flight figure. Error is the sync error, and that record already refuses to be reached from the empty
state, since a failed first sync is a fault rather than an absence. Not found has no component: a
playlist that does not exist, or that was shared to this account and is not any more, answers 404, and
the empty state cannot stand in for it because the empty state's words say that nothing is here because
the playlist has never synced, which would be a lie. So a fourth state is designed here.

**Two dialogs are hosted here and nowhere else, on both arrangements.** Sharing, and adding a video.
The second is on the detail only, with the current playlist preselected and any other writable playlist
selectable, which is what makes its label mean the same thing everywhere it appears; there is no
version of it without a preselection, which is why the library does not host it. It fires one
`POST /playlists/:id/tracks` per chosen playlist, since no multi-playlist route exists.

**Three controls are permission-gated, and absent rather than disabled.** A `write` collaborator may add
a track, remove a track and sync. Rename, delete and share management stay with the owner. The rule is
one sentence so it can be checked against this screen in one pass, and a visible control that cannot be
pressed is the fault the validator already checks for in the track row.

**The way home is a web fact only.** On mobile the platform gesture returns from a pushed route, so the
mobile arrangement has no way-home control to place. Web has no gesture, so the web arrangement carries
the affordance back to `/`, and the library needs none. Draw it, measure what it costs the header, and
say in the record that its absence on mobile is the gesture rather than an omission.

**The header record cannot be assumed to hold at 390, and the reason is a gap in the record.**
`docs/design-system/components/header-transport.md` measures absolute pixels: three equal 48px transport
steps cost 160px of the actions column, one row of five costs 208px, and the title column ends up at
750px, 670px or 718px depending. It never states the width it measured those at. Its sibling, the empty
state record, names both 1014 and 390 explicitly, so the omission is the header's alone. So the mobile
arrangement cannot be assumed from the web one, and the phone header has to be measured from nothing.
Measuring both in one record is what closes that gap: state the width the header's own numbers came
from, beside the phone measurement, so the next reader does not have to guess it again.

**The height budget is measured, and the two arrangements are measured differently.** The sync summary
is 66px at rest and 91px while a run is active, and a track row is 65px. The mobile arrangement has
610px of content area on an 844px phone between a 136px header and a 98px bar, so 8 rows and a resting
summary is 586 of 610 and the in-flight summary drops it to 7. On web the width is not the constraint
and the height is, so state the viewport height the web arrangement is drawn at and what it fits,
rather than carrying the phone's number across. A fourth state, not found, has no height to give in
either.

> **Corrected by the mobile pass, and the correction is the point.** Every figure in that paragraph is
> arithmetic on a plain row, and none of the three is what the screen does. The content area is
> **609.4px**, not 610, because the frame's border is inside its 390 and its content box is **388.4 by
> 842.4**. The resting summary is **66.4px**, not 66. The in-flight summary costs **no** row rather than
> one, because the eighth row's bottom was already under the bar at 764.2px and moves to 788.4px, both
> past a 745.4px bar. And the answer is **7 rows, not 8, in the resting state too**, because two of the
> fourteen rows are **76.1px**: the failed and unavailable ones, each carrying a reason line 11.3px below
> the sub line, and 22.6px of extra row is a third of a row. The budget is spent by the track rows, not
> by any component above them, which is the one thing an arithmetic budget cannot see.

## Scope

- `docs/design/screens/playlist-detail.html`: both arrangements. A row in `docs/design/index.html` and a
  row in the map in `docs/DESIGN.md`.
- `docs/design-system/screens/playlist-detail.md`, opening with the two arrangements named and kept
  apart, and attributing every measurement to a width.
- A new component record and specimen for the not-found state.
- The share dialog record, and the add-a-video dialog record including its checklist over writable
  playlists and the fact that it issues one request per chosen playlist, drawn on both arrangements
  since a dialog is narrower on one than the other.
- The header measured at both widths, with the web arrangement's way-home affordance and the mobile
  arrangement's lack of one.

## Do not

- Do not redesign the header, the track row, the sync summary or the sync error. They are specified
  and this screen composes them. If one cannot be composed here, that is a finding to record in the
  screen's record rather than a change to make here.
- Do not treat the mobile arrangement as the web one squeezed. Three 48px steps, a cover, a name, a
  count and a dialog trigger do not fit at 390, and the point of measuring is to find out what gives.
- Do not make the summary's in-flight figure a server fact. There is no stored pending count in the
  contract and the figure is derived from the tracks the client holds, which the record says out loud.
- Do not show rename, delete or share management to a collaborator. Absent, not disabled.
- ~~Do not draw a queue. It is a panel on the player bar record, and it can be opened from here on either
  arrangement.~~ **Superseded, and the premise was false.** There is no queue panel on the player bar record
  and never was, so this line pointed at nothing. Resolved in the screen's record: the track list is the
  queue, so the screen places no trigger and no panel, and "queue" in the request that prompted the fix
  meant the previous and next steps the bar's transport already had.
- Do not add a way-home control to the mobile arrangement, and do not add a tab bar to make the mobile
  header shorter.

## Blocking edges

Nothing blocks this ticket. It was blocked by `14-expose-the-last-sync-run`, which the sync summary
and the sync error both bind to, and by `18-expose-playlist-access`, which added `access` and
`hasShares` to `PlaylistSchema` so that "absent for a collaborator" has a field behind it rather than
only a rule. Both have landed.

The two access values are worth reading before the permission-gated controls above are drawn.
`access` is `owner`, `write` or `read`, and it is the level that decides the overflow menu, so the
three menus this screen has to draw are the owner's four items, a write collaborator's two, and a
read collaborator's one. `hasShares` is a separate boolean about the playlist rather than the reader,
and a record that treats the two as one fact will draw the wrong menu for somebody.

## Verification

- `node docs/design/scripts/validate-design-tokens.cjs` passes, with no registration needed for the new
  files.
- Both arrangements are drawn, and every measurement is attributed to a width.
- Three of the four states are drawn: never synced, syncing and error, all three using their existing
  components unchanged, and the record says so rather than redrawing them differently. **The fourth, not
  found, is not drawn and has no component.** The Scope below lists it as work, and this item was
  written as though it were met. It is corrected here rather than left as a false claim on a closed
  ticket, and it is named in the record with what it needs.
- The record states which of its facts are web-only and which are mobile-only: the way home, the absent
  back control, the signed-out library is not this screen, and the phone height budget.
- The three owner-only controls are absent for a collaborator, and the record names which three they
  are.
- The header is measured at both widths, and the record gives the width the existing header record's
  numbers were taken at, which is the gap this ticket had to work around.
- Every new text pairing has a computed ratio clearing AA.
- `pnpm run build` and `pnpm run lint`.

**The regeneration order is generate, splice, format, validate, and getting it wrong looks like a mass
rewrite.** `splice-morph-block.mjs` writes the morph block in its own formatting, so running it after
`prettier` un-formats the whole file: `library.html` came back with 1620 changed lines and no content
change at all, which is indistinguishable from the generator having rewritten the specimen. Run in the
order above, `library.html` is 3 deleted lines and those 3 are a comment about a demo box the lift no
longer takes.

## Outcome, first pass: the web arrangement

The screen is drawn on web, which was the first pass, and the record is at
[the screen record](../../design-system/screens/playlist-detail.md)
with the specimen at `docs/design/screens/playlist-detail.html`. At the end of this pass the mobile
arrangement, the not-found state and the two dialogs are not drawn, and each is named in the record with
what it still needs rather than left out; the second pass below draws the mobile arrangement and the
last section of this ticket accounts for the three that remain.

**The shape: two columns and a docked bar.** The left column carries the playlist and the right one
carries the tracks, at 1056 wide in a frame of a stated **900px** height, because on web the width is not
the constraint and the height is and a frame with no height cannot answer a question about it. 1056 is
the same content column the library's own web arrangement uses, and the frame takes its border out of
the 1056 rather than out of it so the two screens stay comparable.

**The left column is the playlist header's own card arrangement, unmodified, at 320px.** The header has
a row arrangement and a card arrangement, and this is the second of them rather than a third, so nothing
about the component is re-decided. What the narrower column costs, measured against the header's own
356.4px: a scrim that is **27.8%** of a 288px picture against **24.7%** of a 324.4px one, and a name
column of **260px** after the share indicator, which is **22 characters** against the header's own 25.
The card is 400.4px in every state, resting and playing.

**320px is measured, not chosen, and the measured floor is 3.96px above the arithmetic one.** The sync
summary's band is four `1fr` cells and its widest thing is a five-figure kept count at **60.01px**, so a
column of `W` gives each cell `floor((W - 36) / 4)` and the arithmetic floor is 276.04px. At 276px the
cell is 60px and the figure is 60.01px, so it does not fit by a hundredth of a pixel, and the first
width that does is **280px**. 320 is 40px above it. The header's own meta line is the other floor in
that column and it is not the binding one: 198.16px measured in a 288px box, 89.84px of slack.

**At 900px, 11 of the 14 rows clear the fold** and the bar's top is at 803.8px. The shortest viewport
the left column fits in at all is **737.1px**, set by the sync error, which is the tallest thing the
column ever holds at 640.1px.

**The way home is a chevron and the word `Playlists`, and it costs one row of fourteen.** 11 whole rows
with it, 12 without, the twelfth row's bottom being 34.3px under the bar in the first case. The absence
of one on mobile is the platform gesture rather than an omission, and the record says so where the
mobile arrangement will be.

**`chevron-left` went into the pin for that one control.** One path, verbatim at
`@tabler/icons` 3.48.0, centred on the 24 unit grid, and it carries no optical correction: there is no
`PINNED_OPTICAL` entry for it and the validator's rule that a centred glyph must not carry one is what
asserts that.

**Three of the four states are compositions and none is redrawn.** Never synced is the empty state in
the list area with the card beside it and the play disabled; syncing is the header's busy form plus the
summary's in-flight figure; error is the sync error **in place of** the summary rather than beside it,
because a column carrying both would put the same news in the same 320px twice. The count reads 0 on a
never-synced playlist, which follows the header's own longer argument and not the shorter comment beside
one of its states; the header's markup still omits it and that contradiction is left named as the
header's.

**The three access levels are drawn with one menu open each.** Owner holds four items, a write
collaborator holds `Sync now` alone, and a read collaborator gets **no overflow button rather than an
empty one**; the shuffle stays, so that band is 92px of the 286.4px it has rather than 224px. Rename,
Delete playlist and share management are absent rather than disabled, and the record names the three.

### Six faults found by drawing it, and one of them is still open

**One fault was a phone's bar on a desktop, and it was invisible in the markup.** Every frame on this
screen carried `bar--flush`, because the lift out of the player bar's record had taken the 390 drawing: it
was correct for the library, whose bar is 388.4px, and it was reused here at 1056 without anyone asking
which variant it was. Measured at 1056: the transport sat on the right edge **443.2px** off the bar's
centre, the shuffle came back `display: none` so there was no shuffle on the web at all, and the seeker ran
**956.17px** where that record's argument is a 480px cap, because uncapped a four minute track moves its
playhead 3.7px a second. Three claims the component holds on its own specimen, all failing on one screen.
The lift now takes the centred arrangement as its base and a consumer adds `bar--flush` if it wants the
phone's, which is how the component parameterises it; the library regenerates byte-identical apart from one
trimmed comment, so this is a reordering and not a change. After it, measured on all seven barred frames:
`427.2px 136px 427.2px`, transport 136px posting **0px** of offset, play **0px** off centre, shuffle `flex`
at **495.2px** right of centre, seeker **480px**, title room **375.2px** for 338.85px of name shown whole,
bar 97px. Reinstating the class returns `870.4px 136px`, 443.2px of offset, `display: none` and 956.17px,
which is how the fault was proved.

**One fault was a number in prose that no layout produces, and it was found by checking rather than by
reading.** The player bar's own specimen claimed `729px` of title room at 1056. Measured in that file, at
1056: the centred arrangement gives **375.2px** and the flush one **818.4px**, so the centre costs
**443.2px**. 375.2 had also drifted into the record as "centring costs 375px of title room", which is a cost
larger than the room it is spent in, inside the same paragraph as the sentence saying 263px of title
remains at 390. A figure that cannot be true is worth more attention than one that is merely wrong, and
neither is reachable by reading the stylesheet.

**Every track row in the tree was 120.8px rather than 65px.** The playlist header's `.body` rule, in
the shared stylesheet, was landing on the track row's `.body`, because `track-row.html` declares its
own without ever setting `display`, so the header's rule won on the two declarations the row never
mentioned and the row's title and sub line sat inside a 96px `min-height` flex column. **The 65px that
the sync summary, the empty state and this ticket all quote was a number no specimen produced.** The
rule is now `.hdr > .body`, which separates the two on a fact about the markup rather than on a guess
about which file came first, and it is **proved behaviour-preserving**: all fourteen headers in the
header's own specimen and all nine items on the library measure the same before and after, to the
digit. Rows are 64.8px after it, which is 64 plus the 0.8px this environment renders a 1px border at.

**The same collision had a second face, on `.state`, and it cost a line rather than a factor.** The
header's `.state::before` is a 7px mark in the state's own tone, and the track row's `.state` is a single
coloured word with no mark, so every state word in every track row carried one it never asked for and was
**15px** too wide. On a phone the width is what decides a line: the failed row's sentence fitted on one
line at 390px and the mark put it on two, taking the row from **76.1px to 92.3px**, a whole 16.2px line
and a quarter of a row. Measured on the track row's own specimen: `Downloading` 86.85px becoming 71.85px,
`Failed` 48.31px becoming 33.31px. The rule is now `.hdr .state, .mhdr .state`, proved the same way:
all nineteen of the header's own states and all twenty of the library's keep the 7px mark, and every
header and library figure is unchanged. Two rules of the shared stylesheet were landing on a component
that does not belong to them, and both are one mistake: a class name in a shared stylesheet is a claim
about every element in the tree carrying it, not about the file that wrote it.

**Five of the track row's class names are also the shared stylesheet's, so the row's rules have to be
scoped to be composed beside the header at all.** `row`, `play`, `state`, `lane` and `art`. `play` is
the one that cannot be worked around: the header's is 48px, the row's is 28px, and the morph's block
addresses the name unprefixed because the block has to stay byte identical across every specimen
carrying it. The rules are therefore lifted and namespaced under `.tl` by the generator and the markup
is **not** renamed, so the morph's host list is untouched and stays at four. Proved by putting it back:
the row's play goes 28px to 48px, the row 64.8px to 72.8px, and the fold 11 rows to 10. **The durable
fix is a second shared block with distinct names, which is a change to the track row and belongs to a
ticket about the track row, not to this one.**

**A fault of mine, and no check in the tree could see it.** The playlist's name is an anchor, and
an anchor does not inherit, so the user agent's `a { color }` beat any inherited value and the name drew
in the browser's link colour with an underline. The fix is the library's own rule. Nothing catches it,
because the value is a user-agent default and not a literal in a file.

**The `Sync now` buttons this screen composes now carry `rotate-clockwise` at `--icon-sm`**, which is the
glyph the overflow menu already drew on the same verb, so the retry in a panel and the menu item are one
control twice. A button is **126.81px** with the mark and **115.8px** busy, the 11.01px of change being the
label's two characters. What it cost this screen is **nothing, and that was measured rather than assumed**:
both buttons sit in a centred or column stack, so the left column still ends at 460.1px with the empty
state and 640.1px with the fault and the floor is still 737.1px. A control that grows 24px is the kind of
thing that quietly costs a row somewhere, so the check was worth making.

**One frame has no player bar, and it is the bar's own record that says so** rather than a decision made
here: "a bar that is present but has nothing to play does not exist any more". A bar carrying a track on
a playlist that has never synced would assert playback the same frame's card says cannot happen. The
other seven frames carry it, which is the point of this being the first screen in the product where the
bar is drawn at rest.

**Every state-carrying row on the screen was checked against the track row's own specimen and matches it
to the digit** in child order, classes, state widths, row height, play size and disabled state. On a
component whose rules had to be namespaced to be composed at all, that is the test of "composed rather
than redrawn".

### One measurement of mine was wrong and is recorded rather than tidied away

The first measurement of what the way home costs said the fold did not change. **The fault had not been
applied**: the style was appended and the count read in the same expression, so a null result from a
fault that never landed is indistinguishable from a null result that did. Re-measuring with the injected
rule's own computed `display` asserted in the same call gave 12 rows, and the difference is one row. The
rule that came out of it is the one this record uses throughout: assert the fault is applied before
believing the number it produced. All six faults on this screen were proved by putting them back, and
the mobile pass added three more on that form and one probe that had to be rewritten because it read
two states in the wrong order.

### What is not drawn, and what each of them needs

**The not-found state**, which needs its own record and its own specimen. The empty state cannot stand
in for it, because its words say that nothing is here because the playlist has never synced, which is a
lie for a playlist that was shared to this account and is not any more, and a playlist that does not
exist and one the account cannot see both answer 404 at one status.

**The share dialog and the add-a-video dialog**, both of which need their own records, and a dialog is
narrower on one arrangement than on the other so neither can be drawn once.

## Outcome, second pass: the mobile arrangement

**Seven phone frames at 390 by 844, and the arrangement is one column: the header on top, the rows
under it.** The web pass drew eight desk frames; this draws seven phone frames beside them, in their own
section rather than interleaved, because a page showing a desk, a phone, a desk and a phone is read as
four screens with two layouts each. Three states, three access levels and the playing state; the
never-synced frame carries no bar, for the same reason as on the desk.

**The header is the component's row arrangement, and the measurement chose it over the card.** At 390
the card is **470.4px** and the row is **136px**, which on 842.4 less a 97px bar is 275px of list
against 609.4px: four rows against nine, and two once the resting summary has its share. Nothing about
the component is re-decided, which is the same discipline the desk's left column follows at 320px.

**The ticket's own gap closed, in the record that had it.**
[header-transport.md](../../design-system/components/header-transport.md) now states that its three
figures are 1056px figures, with the phone's beside them. The phone's row is 96 + 20 + 180.4 + 20 + 72 =
388.4 and 136 tall.

**One decision put to the human rather than taken, and it was not a height decision.** At 390 the
identity block has 180.4px and the sync line needs 198.16px for its three spans, so the line is
17.76px short; `.meta` is `nowrap`, so the last span wraps inside itself, arrives at 81.71px and takes
32.4px instead of 16.2, and strands the separator at the end of the line above. Keeping the time and
accepting a dangling middot, or leaving the time off, cost **0.6px** of header between them, so there
was no measurement to break the tie. The time came off, which is what
[the library record](../../design-system/screens/library.md) already does at 390 for the same reason.
**The cost is named in the one state where it is real:** the sync error replaces the summary and carries
no stamp, so on the error frame "Synced 6 days ago" is nowhere on the screen.

### Three faults on the mobile arrangement, and two of them are the same mistake twice

**A fifth fault was a probe that read two states in the wrong order and labelled them backwards.** The
first attempt at proving the state mark reinstated it, then read the "clean" figure, and reported a
92.3px row as the screen's own. It is not: the clean row is 76.1px and 92.3px is the faulted one. The
sign was right and the label was wrong, which is worse than a null result because a null result announces
itself. The proof was rewritten to read clean, inject, assert, remove, re-read, and to refuse to return
numbers unless the injected rule's own computed `width` came back `7px`. All three proofs below are on
that form.

**The state mark, unscoped, back on the track row: every state word 15px wider and a row 16.2px taller.**
`Downloading` is 71.85px and becomes **86.85px**, in all six barred phone frames, and one row goes
76.1px to **92.3px** because the failed row's reason sentence wraps. It costs no row on this screen,
which is worth saying: the mark's cost is height, and this frame has 22.6px of height to give.

**The row's play, unscoped: 28px to 48px, and a row of the fold.** The row goes 64.8px to 72.8px and the
rows clearing the bar go **7 to 6**.

**The header's `.body` rule, unscoped: every row 120.8px, and three rows of the fold.** All fourteen
rows become identical at 120.8px rather than 64.8 and 76.1, and the rows clearing the bar go **7 to 4**.
This is the same mistake as the web pass found twice, in the same shared stylesheet, and it is the third
time it has been counted: a class name in a shared stylesheet is a claim about every element in the tree
carrying it.

**The bar's arrangement, proved by removing `bar--flush`.** The row becomes `93.4px 136px 93.4px`, the
transport posts 0px of offset, and the seeker runs **45.8px past the bar's right edge**, which is
[the player bar's cap argument](../../design-system/components/player-bar.md) reproduced at 390. The
flush variant gives `202.8px 136px`, the transport 109.4px off centre and the shuffle at
`display: none`. Both numbers are the reason a variant has to be a class a consumer adds rather than a
copy that ships carrying one.

### What full-bleed costs, and a scan that was wrong

**Full-bleed puts 5.2px of track-next's touch target off the screen, on one frame.** The steps are
borderless, so the header record's rule grows their 44px target outward six pixels a side by a `::before`
that paints nothing. At rest nothing overhangs: the actions column's last item is the bordered overflow
button. While playing it is a step, its target's right edge lands at **546.4px** against the frame's
**541.2px**, and the header's `scrollWidth` is 394 against a 388 client box. Insetting the actions
column 6px fixes the number and costs 6px of the identity block on the frame that can least afford it,
88.4px to 82.4px for the name. It is left in place and named: the control is not unreachable, because
the docked bar on the same frame carries its own transport with the same 44px targets, and 38.8px clears
WCAG 2.2's 24px minimum. A cost that exists only while a playlist is playing is a cost nobody looks at
twice, which is the argument for writing the number down rather than for spending 6px to remove it.

**A scan that flagged every glyph on the frame as overflowing was the scan being wrong, and both halves
are worth keeping.** Asking "does any element's box cross the frame edge" across the whole descendant
tree reports the `play__strip`'s `<g>` and `<path>` children as reaching up to **179px past the edge**,
in every frame. An SVG child's `getBoundingClientRect()` is in the glyph's own scaled space and is not a
layout box; the button clips them. The check that answers the question is `scrollWidth` against
`clientWidth`, which is how the 6px above was found in the first place. A check that reports a fault it
cannot explain is worse than no check, because the next reader inherits the number.

### What the phone's budget is, and the arithmetic that got it wrong

**The content area is 609.4px and seven of fourteen rows clear the bar, and the seventh is bought by the
track rows rather than by any component above them.** The list starts at **222.4px**, the bar's top is at
**745.4px**, and the eighth row's bottom is at **764.2px**. Two of the fourteen rows are **76.1px** rather
than 64.8 because each carries a reason line, and 22.6px of that is a third of a row. The shortest
viewport that fits the arrangement with nothing scrolled off is **433px**, set by the error frame, whose
180px of sync error against the summary's 66.4px is 1.75 rows and drops the answer to five.

**And the arithmetic in this ticket's own Context got all three of its numbers wrong, which is the
reason they are corrected in place rather than deleted.** It said 610px of content area, a 66px summary
and 8 rows dropping to 7 in flight. Measured: 609.4px, 66.4px, and **7 rows either way**, because the
in-flight summary's extra 24.2px moves the eighth row's bottom from 764.2px to 788.4px and both were
already under a bar that was already hiding it. An arithmetic budget counts the components above the list
and cannot see the list's own rows, which is the same lesson as the track row's 76.1px arriving from the
`.state` collision and being invisible until it was measured.

### What closing this ticket leaves open, and where each piece is written down

The screen is drawn on both arrangements and the record is at
[the screen record](../../design-system/screens/playlist-detail.md). **Three items of the Scope above are
not drawn**, and they are named here rather than absorbed, on the same rule ticket 16 closed on: a
resolved record that quietly drops a third of its own scope is how the next reader inherits a hole and
believes it was decided.

- **The not-found state.** No component exists, so there is no record to update and no specimen to add
  to. It needs its own record and its own specimen, and the empty state cannot stand in for it because
  its words say that nothing is here because the playlist has never synced, which is a lie for a
  playlist that was shared to this account and is not any more. A playlist that does not exist and a
  playlist the account cannot see both answer 404 at one status, so the state has to speak about both
  without claiming to know which happened. Written up in the screen record.
- **The share dialog and the add-a-video dialog.** Both need their own records, and neither can be drawn
  once: a dialog is narrower on one arrangement than on the other, so each needs both. The add-a-video
  dialog is on the detail only, with this playlist preselected and any other writable playlist
  selectable, and it issues one `POST /playlists/:id/tracks` per chosen playlist because no
  multi-playlist route exists. Written up in the screen record.
- **The track row's durable namespacing fix**, already open on the first pass and unchanged by the
  second. The generator scopes the row's rules under `.tl` and leaves the markup unrenamed, so the
  morph's host list stays at four and nothing else has to move. The fix itself is a change to
  `track-row.html`, which belongs to a ticket about the track row and not to this one.

**And the server gaps are unchanged, so nothing here is drawn against a route that does not answer.**
`POST /playlists` is still a `sendNotImplemented` stub, the three share routes are still unowned, there is
still no owner-name lookup for a shared playlist, and every `trackCount` is still 0 until the first
association writer lands, so the rows are drawn from fixtures with real counts.

**Nothing from this ticket is committed.** The specimen and the screen record are untracked files and the
records are unstaged changes; the human owns git history.
