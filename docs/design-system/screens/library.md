# The library

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The route a user lands on, and the only entry point to content. A header and a list.

## Two arrangements, and the width every number came from

Web is `/` at **1056** and mobile is the app root at **390**. One record carries both rather than two records
with a variant between them, because the token layer is one value set consumed by two runtimes and
splitting a screen by client would contradict it. Every figure names its width, so a reader who reads only
the web half can tell it is half.

1056 is the content column this file's own specimen frame produces at its maximum width: `1120px` less
`--space-7` either side. It is not the empty-state record's **1014**, which is 1056 one step further in,
inside a `.panel` with its own `--space-5` padding and 1px borders taken off. A screen is not a panel, so
the screen's number is the wider one.

What differs, before any other number: the header is 78.4px on web and 68px on mobile, 56px on mobile once
the add control becomes a floating button; the surface is `--bg` in both and items sit on it directly; an
item is 136px on web and a card is **172.2px** wide in a two-column grid on mobile; the signed-out state
exists only on mobile; and the arriving player bar costs both arrangements the same 97px. What does not
differ is the component: an item is [the playlist header](../components/playlist-header.md) in both, at the
arrangements that record owns.

## The item is the playlist header, and the mobile list is a grid

An item is the playlist header, not a component of this screen's own and not a smaller thing that resembles
it. This screen is a gallery of headers, so [that record](../components/playlist-header.md) owns the
component at both arrangements, and its rules live in `docs/design/specimen.css` beside the equalizer strip
because there are two consumers. What the item adds to the component is four things, all consequences of a
header becoming one item in a list: the links, the grid it stacks in, the permission facts the overflow is
gated on, and nothing else.

### The mobile list is two columns

At 390 the content area under the library's own 56px header is **788px**, so one 436.8px card per row
cleared it and only 1.8 cards fitted. Two columns put **six whole cards** above the fold at the card's
223.6 or 247.3px, or four with the player bar docked.

Three columns is unavailable by arithmetic: at three the track is 111.33px against 154px of card content,
the action row is 76px against a 47.33px cover box, and the 80px control band would be **100.9%** of a
79.33px cover, taller than the picture it sits on. The cover needs no second size, because `.mart` is
`aspect-ratio: 1`.

Four controls once sat on the picture and one does now. The cover is 140.2px and 108.2px of that is inside
the band's own 16px padding, while the play, the shuffle and the overflow together need 168px: the overflow
was clipped by the picture, and on a playing card the transport and the action row overran the card by 85px
onto its neighbour. Three changes each removed a control rather than moving one: the overflow, because
rename, delete, managing shares and syncing on demand are all reachable inside the playlist on a phone; the
transport, because a 172.2px card fits one 48px control and not three at 136px; and the shuffle moved to
the picture's top left, because a second 84px scrim band would be 192px of a 140.2px cover.

The band holds one control and it is the same control in both states: the header's own play, becoming its
pause when this is the playing playlist. Nothing moves when it starts: the band keeps its 16px padding, the
play stays at the same x, and no equalizer strip is drawn on a card. A playing card differs by a glyph, a
label and the accent colour of that glyph, so **the pause glyph is the only signal of what is playing, 48px
of button on a shelf of six**; on web the item also carries the strip, so there the state is legible without
a press.

The card drops or moves five things, all of them this screen's decisions declared here rather than in
`specimen.css`:

1. **No overflow at all.** Rename, delete, managing shares and syncing on demand are all reachable inside
   the playlist on a phone, so a card carries no menu and no button for one. `access` gating is a web
   question.
2. **The sync line joins the count and the time is left off**, so `128 tracks` at the left and `Up to date`
   at the right, and `Sync failed` alone on the one card with no count. The card is **223.6px** tall against
   the 247.3px the two facts came to on two lines. This withdraws the earlier cost that a failed playlist
   was invisible on a phone until somebody opened it.
3. **The count keeps its unit word and its line may be two lines tall**, which is what putting the two facts
   at opposite ends costs: a card is 223.6px or 247.3px depending on whether its count and its state
   together exceed the line. That is a reversal of the earlier constant-height claim, stated as a cost.
4. **The name drops a step**, from `--text-xl` 24px to `--text-lg` 20px, buying about two characters. It is
   the one place this arrangement re-decides a type size the header fixed; the header may not, because
   dropping a size means re-deciding how much of a long name survives.
5. **No transport, and the shuffle moves to the top left corner of the picture.** The chip's centre and the
   play's centre share one vertical axis **40.8px** from the picture's left edge, because the eye lines up
   centres and not edges: sharing a left edge had left the centres **8px apart**. The inset is `--space-4`
   plus half of 16, which is `--space-6`. Measured on all six cards, resting and playing, the centres are
   **0px apart** and both targets are wholly inside the picture.

The count is at the left and the state at the right, with no separator: a middot would be a third thing
floating between two facts that are not adjacent, and the `--space-2` gap is what guarantees they never
touch, running from 8px on a full line to 52.62px on the emptiest. Right alignment is why the state moved:
the three state words are **57px**, **70.8px** and **73.76px** wide, so only right alignment makes the
longest read as a column edge and `Sync failed` sits at the same x on every card. A card with no count
carries `margin-inline-start: auto` on the state, or `space-between` would put it at the left edge of the
card on exactly the card most likely to have a fault.

The two cannot both fit at opposite ends: "1284 tracks" is **74.66px** and `Sync failed` with its dot is
**73.76px**, **148.42px** of a 140.2px column. Three things fit and the noun wraps: the state is `flex:
none` and nowrap, the count is `flex: 0 1 auto` with `flex-wrap: wrap`, and the count's number is `flex:
none` inside it, so the noun drops to a line of its own and the figure never breaks. Measured on the six
fixtures, four cards are 223.6px and two are 247.3px.

The line is aligned on the baseline and not centred. The state's synthesized baseline is the dot's bottom
edge, which at these metrics coincides with the word's own baseline, so the number and the word are each
**14.4px** from the top of the line, **0px apart**, on one-line and two-line cards alike. It is fragile and
nothing in the tree checks it: changing the dot's height or the line height lifts the word, with no width
changing and no assertion failing. The state also takes `font-size: var(--text-xs)` on this screen's own
line, because `.state` inherits it from `.meta` and this line has no `.meta`, so it was rendering at
`--text-sm` (83.6px against the header's 73.8px).

A card is 223.6 or 247.3px tall and six clear the 776px content area, or four with the bar docked; the six
fixtures finish at 247.3, 247.3, 482.9, 482.9, 742.2 and 742.2px. That is luck rather than design and would
not survive a seventh fixture with a four-figure count in the second row. The scrim stays and covers
**57.1%** of a 140.2px cover, against 24.7% of the 324.4px cover one card per row gave it, which is the cost
of leading with the artwork.

The band swallowed taps: a div receives events across its whole box, so every part of the 80px band that was
not a control took the tap instead of passing it to the cover link under it, and on a resting card 27% of
the picture was the link, 18% was the control and **55%** was the band's empty padding. `pointer-events:
none` on the band and `auto` on the controls inside it puts the dead area at **0%** and the link's share up
to 63%.

### The add control, the empty shelf, and the grid's requirements

The add control is a floating action button on mobile and a labelled button in the header on web. On mobile
the header is **56px** rather than 68px and the content area **788px** rather than 776px. The button is
**56 by 56px**, a circle inset `--space-4` from the frame's right and bottom, and when the 97px bar is
docked it sits **113px up** so it clears the bar by 16px. It covers **32.5% of a 172.2px card's width** and
15.7% of the content, and it needs **88px** of clearance at rest and **185px** with the bar, which is 23.8%
of the content area paid in scroll for a control that does not scroll with the grid. It has no visible word;
the name is on `aria-label` and the glyph is a plus. An extended pill carrying "Add" measured 98 by 56px,
**56.9% of a card's width**, and was rejected. There is no shadow token in this system, so the button is
`--accent` on `--bg`, the 5.85:1 the add button's legend already had. Its tier is `--z-sticky`: above the
grid, below the 97px bar at `--z-player`, and below a dialog's scrim at `--z-overlay`, because a dialog is
what this control opens. The glyph is `--icon-lg` 28px, **50%** of the box, against `--icon-sm` at 29% and
a 48px box at 58%.

The empty shelf's frame gets no floating button: its own action is a full-width button in the middle of the
screen, and a floating copy would put the action twice on the one screen where a person has seen neither.

The grid asks the card for four declarations, each the grid asking for something a card in a column never
had to be told: `min-width: 0` on the item, because a grid item's automatic minimum is its min-content
width (measured, 189px of card in a 172.2px track before it), and three on the blocks under the cover,
whose widest is the 205.85px name line. They are declared here because they are the grid's requirement and
not the card's. Every item carries a share indicator, because `access` is on every playlist.

## The links

An item cannot be a link: it holds a play button, a shuffle and an overflow, and a button inside an anchor
is invalid HTML. The cover and the name are both links to the playlist, which a shelf of destinations needs,
because the alternative leaves a 356.4px square that does nothing when tapped. The cover's link carries
`aria-hidden="true"` and `tabindex="-1"`, so a screen reader announces one link per item rather than two,
the name carrying the label. On a card the cover cannot be the link, because the card puts two buttons on
the picture, so the link is an absolutely positioned sibling inside it, painting below the controls
(hit-tested rather than assumed). This is the only link in the system without an underline: every item is a
destination and the item is the affordance, so forty underlined names would say the same thing forty times.
`color: inherit` is required, because an anchor does not inherit and the user agent's `a { color }` would
draw the name in the browser's link colour instead of `--ink`.

## The three overflows, and what `access` decides

`access` is on every playlist and the overflow is gated on it; the glossary is authoritative. An owner's
overflow holds all four items, a `write` collaborator's holds `Sync now` alone, and a `read` collaborator
gets **no overflow button at all** rather than one with nothing in it, because there is no action to take
and a menu that opens onto a blank lies about what it can do. The two collaborator items carry the same
glyph and different menus, which is the honest picture: the indicator is coarser than `access` is, so what a
person may do is invisible until the menu is open and then it is exact. The menus are drawn on the card
rather than the item because they open upward into the picture: the item's opens downward and is 170px tall
against a 137px item, so two would overlap by 33px.

## Shuffle is on every item

Forty items means forty `aria-pressed` shuffle toggles for one player's shuffle, and shuffle is a property
of playback rather than of a playlist. Dropping it from the item and keeping it on the player bar and the
detail screen's header was the alternative, and it lost because the item is otherwise identical to the
header and one exception is easier to notice than forty controls. The cost is named rather than paid
quietly.

## What the item deliberately does not carry

A shared item says it is shared and not who shared it, because nothing can supply the owner's name:
`ownerAccountId` is a UUID, `GET /me` returns only the signed-in account, and `GET /accounts` is a stub. The
line is wanted, nothing supplies it, and the item carries the indicator alone rather than a placeholder
name, because a placeholder in a specimen is read as a decision.

The item carries the sync state, because the sync line is the header's and this screen draws headers. The
earlier decision to withhold it, so a failed playlist stayed invisible until somebody opened it, was a
decision about a component this screen does not own, and the cost is now paid for in `--tone-failed` on
every row. The equalizer strip is on the one playing item and no other: playback is per client and
`data-state` is a single value, so at most one playlist is playing, and a card's square cover gives 51.4
bars and cannot carry the strip's 14.

There is no search, no sort, no filter and no pagination. Search is a permanent non-goal in the glossary and
the page size is `PageQuerySchema`'s default of 50, which is the API's business, so a shelf of more than 50
playlists is a shelf this screen cannot show all of. That is recorded as a known limit rather than solved
by inventing a control the glossary has ruled out.

## The header

A quiet title and one control. "Playlists" is `--text-2xl` on web and `--text-lg` on mobile, the step the
type scale names for screen titles. The add control is the same 36px box in both, with a 44px target around
it on mobile. Its `plus` is `--icon-sm` and `aria-hidden`, paired with the `--text-sm` label: at `--icon-md`
the ink is 1.36 times the cap height beside it, at `--icon-sm` it is 1.09, which is the pair the menu items
already use. There is no playlist count in the header, because a count of playlists is a standing total
rather than a fact about a row. "Add a playlist" appears twice on the empty screen, once in the header and
once on the shelf, and the two never coexist with a list.

## The empty shelf

A different component from the playlist empty state, and not a variant of it. That one's action is
`Sync now`, because a playlist that exists and has no tracks has never been synced; this one's action is
`Add a playlist`. Drawing the other would tell a person with no playlists at all to sync something. It has
its own [record](../components/empty-shelf.md) and is drawn at both widths on the library's specimen.

## The add dialog

A 400px centred dialog on web and a full-width sheet on mobile, over the one scrim token, with the single
field `CreatePlaylistInputSchema` takes. It has its own
[record](../components/add-playlist-dialog.md) and its own specimen, because the states a person reaches by
doing something to the field are not the states of arriving on the screen. The body says nothing is
downloaded until a sync, because a sync is manual in v1.

## The player bar is not drawn at rest

There is no bar at rest. The bar appears the moment a track starts and takes **97px** docked, which is the
**98px** the [player bar record](../components/player-bar.md) measures less one pixel because the docked
bar's bottom border is against the screen edge. That record said the bar is persistent and answered with a
bar holding an empty identity and a disabled play; it is corrected in place, because the landing screen is
where a bar with nothing in it costs the most.

What the arrival costs is named rather than argued. On mobile the content area is **788px** at rest and
**691px** with the bar docked, so the bar costs two of the six cards the person could see, four surviving.
Nothing about the bar changed; the unit this screen counts in did, three times, and each time the answer had
to be re-measured rather than carried over. The 610px budget in the ticket is the detail screen's (844 less
a 136px playlist header and a 98px bar) and does not apply here: this screen has the first as its items
rather than above them, and its content area is 788px, 178px more.

## Signed out, on mobile only

The state replaces the content area rather than sitting over it, because signed out no other resource in the
app is reachable and there is nothing behind it to dim. Web has no signed-out state at all, and that is not
an omission: the edge authenticates the browser before the SPA is ever loaded. It is a sentence and no
control: the server fails closed with `401 unauthenticated` when the edge headers are missing and
[ADR 0003](../../adr/0003-identity-via-pangolin-forwarded-headers.md) records that the app runs no login, so
a button could only open a flow no ticket, contract or ADR has decided.

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
15.94:1, the count is `--muted` on `--bg` at 6.18:1, the dialog's heading is `--ink` on `--surface-raised`
at 13.42:1 and its body is `--muted` on the same at 5.20:1, the add button's legend is `--bg` on `--accent`
at 5.85:1, and the row's focus ring is `--accent` at 5.85:1 on `--bg`. The rows sit on `--bg` and not on
`--surface`, which is the track list's own arrangement, so the two lists in this product are the same
object.

**Truncation is on both arrangements, and the grid made mobile far worse.** At `--text-xl` the sixth item's
78-character probe name measures **923px** against a column of 848px at rest and 784px while playing, so it
is cut on web in both states. On a card in the grid the name row is **140.2px**, of which the share
indicator takes **20px** and the row's own `--space-2` gap takes 8px, leaving **112.2px** of text: some
**ten characters** at `--text-lg`, where one card per row fitted 27. Measured across the six fixtures,
**four of the six names are cut**. No type step recovers more than three characters: `--text-lg` gives ten
where `--text-xl` gave eight, and `--text-sm` would give about 13. That is what six cards above the fold
instead of one is being paid for.

## What is not drawn

The owner of a shared playlist, by name, for the reason above. Search, sort, filter and pagination. The
equalizer strip on a card, which its own size cannot carry. **The queue panel this record used to list here
does not exist and is not going to**: the [playlist detail's record](./playlist-detail.md) resolved it, the
answer being that the track list is the queue, so there is no panel and no trigger to open one, and the
three records that pointed at a panel on the [player bar record](../components/player-bar.md) were pointing
at nothing. The playlist detail itself is
[`17-design-the-playlist-detail`](../../tracker/tasks/17-design-the-playlist-detail.md).
