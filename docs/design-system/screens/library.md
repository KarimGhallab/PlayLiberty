# The library

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

The route a user lands on, and the only entry point to content. A header and a gallery of tiles.

## Two arrangements, and the width every number came from

Two clients, one record: the **web client** is `/` at **1056**, the **mobile client** is the app root at
**390**. One record carries both rather than two records with a variant between them, because the token
layer is one value set consumed by two runtimes and splitting a screen by client would contradict it. Every
figure names its width, so a reader who reads only the web half can tell it is half.

1056 is the content column this file's own specimen frame produces at its maximum width: `1120px` less
`--space-7` either side. It is not the empty-state record's **1014**, which is 1056 one step further in,
inside a `.panel` with its own `--space-5` padding and 1px borders taken off. A screen is not a panel, so
the screen's number is the wider one.

What differs, before any other number: the header is 78.4px on web and 68px on mobile, 56px on mobile once
the add control becomes a floating button; the surface is `--bg` in both and items sit on it directly; an
item is a **tile**, **252x396px** in a four-column grid at 1056, and a card **172.2px** wide in a two-column
grid at 390; the signed-out state exists only on mobile; and the arriving player bar costs both arrangements
the same 97px. What does not differ is the component: an item is [the playlist
header](../components/playlist-header.md) in both, at the arrangements that record owns.

### Which client owns the narrow width

The **390 arrangements are the mobile client's** and not the web page's: the two-column card grid, the
floating add button, the full-width sheet and the signed-out state below are the Expo app's idioms, and a
browser that happens to be 390 wide is not that client. The **web client is the tile grid at every width it
is served at.** Below its 1056 column the grid drops a column at a time, because the track is
`repeat(auto-fill, minmax(232px, 1fr))` rather than a count, and the tile keeps its arrangement and narrows
with the content column: the name truncates and is recoverable through its `title`, and at the components'
`max-width: 767px` breakpoint the quiet controls grow to the 44px target a touchscreen is owed. The web
client draws no floating button and no sheet, because those are the other client's idiom rather than a
smaller version of this one.

**The web's grid and the mobile's are two arrangements, not one.** The web tile is 252px wide at 1056 and
carries everything a playlist says: the cover, the name with its share mark, the sync line with its elapsed
time, the count, the owner line of a shared playlist, the shuffle, the overflow and the mark below. The
mobile card is 172.2px wide in its two-column grid and drops the overflow, the transport and the elapsed
time, because those are the decisions its own record took above. The tile is the web item because the
artwork is what a gallery indexes by and because a grid row holds four: at 1056 the row arrangement is
**152px per playlist** against the tile's **103px**, and the list of seven that is 1271px tall is a grid of
1024px that scrolls less as the library grows.

## The item is the playlist header, and the mobile list is a grid

An item is the playlist header, not a component of this screen's own and not a smaller thing that resembles
it. The web draws that component's **tile** arrangement and the mobile client its **card**, and [that
record](../components/playlist-header.md) owns all three arrangements. What the item adds to the component
is four things, all consequences of a header becoming one item in a gallery: the links, the grid it stacks
in, the permission facts the overflow is gated on, and nothing else.

### The web gallery is four columns at 1056

The track is `repeat(auto-fill, minmax(232px, 1fr))` with `--space-4` gaps, which is **four columns** in the
1056 column and one fewer at a time below it, so no second rule is needed at a narrower width. 232px is the
narrowest tile the identity block stays legible in: the tile is 252px at four columns, its own and the
under-block's padding take 32px, and the share mark takes 20px of what is left with an 8px gap, which leaves
the name **about 190px** of text at `--text-xl`.

A tile is **396px** tall, and it is 396px with the mark and without it: the mark takes the leading space of
the actions row rather than a line of its own. The gallery's own reading is one column of artwork, so the
figure that matters is the per-item **103px** against the row's 152px. The name is the one thing that pays:
at `--text-xl` about a dozen characters survive, four of the six development fixtures are cut, and the full
name rides in the `title` exactly as it does on a row.

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
of button on a gallery of six**. On web the item is a door and not a play, so the gallery does not mark the
playing playlist at all: the pause and the strip are the card arrangement's, where the band holds the play.

The card drops or moves five things, all of them this screen's decisions declared here rather than in
`specimen.css`:

1. **No overflow at all.** Rename, delete, managing shares and syncing on demand are all reachable inside
   the playlist on a phone, so a card carries no menu and no button for one. `access` gating is a web
   question.
2. **The sync line joins the count and the time is left off**, so `128 tracks` at the left and `Up to date`
   at the right, and `Sync failed` alone on the one card with no count. The card is **223.6px** tall against
   the 247.3px the two facts came to on two lines.
3. **The count keeps its unit word and its line may be two lines tall**, which is what putting the two facts
   at opposite ends costs: a card is 223.6px or 247.3px depending on whether its count and its state
   together exceed the line.
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

### The add control, the empty gallery, and the grid's requirements

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

The empty gallery's frame gets no floating button: its own action is a full-width button in the middle of the
screen, and a floating copy would put the action twice on the one screen where a person has seen neither.

The grid asks the card for four declarations, each the grid asking for something a card in a column never
had to be told: `min-width: 0` on the item, because a grid item's automatic minimum is its min-content
width (measured, 189px of card in a 172.2px track before it), and three on the blocks under the cover,
whose widest is the 205.85px name line. They are declared here because they are the grid's requirement and
not the card's. Every item carries a share indicator, because `access` is on every playlist.

## The links

An item cannot be a link: it holds a shuffle and an overflow, and a button inside an anchor
is invalid HTML. The cover and the name are both links to the playlist, which a gallery of destinations needs,
because the alternative leaves a 356.4px square that does nothing when tapped. The cover's link carries
`aria-hidden="true"` and `tabindex="-1"`, so a screen reader announces one link per item rather than two,
the name carrying the label. On a card the cover cannot be the link, because the card puts two buttons on
the picture, so the link is an absolutely positioned sibling inside it, painting below the controls
(hit-tested rather than assumed). This is the only link in the system without an underline: every item is a
destination and the item is the affordance, so forty underlined names would say the same thing forty times.
`color: inherit` is required, because an anchor does not inherit and the user agent's `a { color }` would
draw the name in the browser's link colour instead of `--ink`.

**The tile is a door even though it is not a link.** A press anywhere on the item that is not a control, a
menu panel or one of the two links opens the playlist, which is what a gallery of destinations owes a person
who presses the middle of a 252px tile. It stays a div rather than an anchor, because the tile holds buttons
and a button inside an anchor is invalid, so the press is the tile's own handler and the controls carve
themselves out of it rather than being the only way past it. The name stays the one link and the one tab stop,
so a screen reader still announces one link per item and the keyboard is unchanged; the press is the pointer's
extra door and not a second tab stop. The row arrangement carries the same rule for the detail's own item at
390, and the card the detail uses as its hero does not carry it.

**The tile lifts to `--surface-raised` on hover, the step a playable track row already takes.** The items sit
on `--bg`, and a press needs a mark before it is taken; the track list answers the same question with the same
colour, so the two lists agree rather than each inventing a hover. `focus-within` draws the mark too, so it
follows the keyboard to the name or a control, and the pointer is set to the press the surface promises.
Nothing moves: no box, no radius and no height, only the surface. The list's closing hairline is gone with the
list, because a grid has no per-item rule to close: the tiles are separated by the gap and by nothing else.

**The list is opened by the page header and closed by one hairline.** A separator between two items is the
header's own `.hdr + .hdr`, so the first row has no rule above it: the page's own header names the screen and
holds the add control, and a second rule there would be a second opening. Nothing follows the last row, so the
list draws one closing hairline under it, and the gallery reads as ended rather than as a row running into the
page's own ground.

## A no-artwork item is a sleeve, and a non-resting one wears its tone on the cover

An item's cover is the header's, and the header's null case now draws the playlist's identity rather than
the anonymous hatch: one of six `--sleeve-*` hues, chosen by hashing the playlist id. A library without
artwork is the case this matters most in, because it is the whole gallery at once, and the wall of grey
squares read as one object repeated rather than as forty playlists. On the tile the sleeve has 252px of square
to fill rather than a 96px box, so a library with no artwork is a wall of identity hues and the gallery is
read by them.

The sync state is on the cover's edge as well as in its word. A gallery is scanned by artwork, so the state
had to be readable from the object and not only from a 12px line inside it: the cover's hairline takes
`--emphasis` while a run is in flight and `--tone-failed` when it broke, and a resting tile keeps the neutral
hairline. It is the same tone as the state word, read from the same element, so the two can never disagree.

**The dot is not a third place.** The critique counted the dot, the word and the hairline as three statements
of one fault, where this record defends two. The dot is not a third: it is the sync line's own mark in every
state, the same seven pixels whether the word reads "Up to date", "Syncing" or "Sync failed", and only its
colour moves with the state. Stripping it to quiet one row would take the line's mark from all forty. So the
fault is the word and the hairline, which is the two the record already chose: the line names it and the
object carries it.

## The three overflows, and what `access` decides

`access` is on every playlist and the overflow is gated on it; the glossary is authoritative. An owner's
overflow holds all four items, a `write` collaborator's holds `Sync now` alone, and a `read` collaborator
gets **no overflow button at all** rather than one with nothing in it, because there is no action to take and
a menu that opens onto a blank lies about what it can do. The two collaborator items carry the same glyph and
different menus, which is the honest picture: the indicator is coarser than `access` is, so what a person may
do is invisible until the menu is open and then it is exact. The panel is 176px wide against a 252px tile, so
it opens downward and stays inside the gallery's own column, and the tile lifts one tier while one is open,
because a grid item's panel hangs past its own box into the row beneath. The mobile card holds no overflow at
all, because rename, delete, managing shares and syncing on demand are all reachable inside the playlist on a
phone.

## Shuffle is on every item

Forty items means forty shuffle toggles, and only the row whose playlist the queue belongs to reports
pressed: shuffle is a property of the queue rather than of a playlist, so a row the queue does not belong
to is unpressed even while the player is shuffled. The cost is named rather than paid
quietly. Each toggle is named for its playlist, `Shuffle <name>`, so the forty are distinguishable; the
component record owns the naming rule and the touch target that goes with it.

**The press starts the playlist it was pressed on.** A toggle that only flipped a flag would act on a queue
the item may not be the source of, so the control is the same action on both surfaces: an empty queue, or one
belonging to another playlist, is replaced by this playlist's and started, shuffled; this playlist's own queue
flips the mode, and turning it on draws a fresh shuffle and starts on its leading track, because reaching for
shuffle is a play gesture like the transport's. Turning it off puts the queue back in the playlist's own order,
which is why that order is kept beside the queue rather than discarded.

**The shuffled queue is led by a drawn track, and the playhead moves to it.** The press asks for a fresh
shuffle rather than a re-arrangement around the track already playing, so the leader is a random playable track
rather than the one sounding or the first stored one: it is hoisted to the front and everything after it is a
full scatter of the rest. Playing `D` in `A B C D E` gives `B D A E C` for one run, with `B` sounding and the
playhead reset to it; `D` keeps its place in the playlist's own order, which is what turning the shuffle off
restores. Undoing the shuffle returns `A B C D E` under a playhead still on `B`, so the next track is `C`.

**A shuffle is an order, and the transport walks it.** The randomness is spent once, on the queue's order, and
`next` is then the next entry whatever the mode is: `B D A E C` plays `D`, `A`, `E`, `C` and stops, and
pressing previous steps back through the same list. Nothing re-rolls at the end of a shuffled queue, because a
next that drew a fresh track each press would play an order the listener cannot see and could repeat a track
it had already played. A press on a row moves the playhead inside the queue on screen rather than rebuilding
it, so the row pressed is the row that plays.

**A press with nothing stored refuses rather than being silent.** The library knows only a `trackCount` over
every association, so a playlist whose tracks are all pending or failed still draws the control. The press
reads the playlist's tracks, finds no playable one, and says so: `Nothing to play in “<name>”.` over
`No track in it has finished downloading.` in the notice slot the volume already uses, which stands for
`4s` and withdraws itself. A read that failed says `“<name>” could not be read.` instead, because nothing
stored and nothing read are different facts. The refusal is a notice and not a control: there is nothing to
press, so the notice has no dismiss.

## What the item deliberately does not carry

A shared item names its owner, and an owned item carries no such line. The line is `Shared by <name>`,
resolved from the playlist's `ownerAccountId` through the account directory that [`05-share-a-playlist`](../../tracker/specs/05-share-a-playlist.md) built. On the account's own playlist `access` is `owner`, which already says the item is theirs, so the line is omitted there and never a "shared by yourself". When the directory does not carry the owner, the item keeps the indicator alone rather than a placeholder name, because a placeholder in a specimen is read as a decision. The line is its own row under the sync line rather than a third fact on the meta line, which at 390 already drops the time.

The play. An item is a door and not a play: a playlist is started from its own screen, and the item's whole
surface is the press that opens it, so the actions row is the shuffle and the overflow and no play. The
gallery still says which playlist is playing, and it says it the way the detail's card does: a **2px
`--emphasis` rule along the playing tile's foot**, drawn in from the left over `--motion-base` when a track
starts and withdrawn when playback stops, with reduced motion dropping the transition and leaving the line.
One tile carries it at a time, because playback is per client and at most one playlist is playing. It replaces
the row's equalizer strip, which is the detail's narrow arrangement and which a gallery of artwork does not
need: the strip is a mark on a 96px cover, and the gallery's item already leads with the artwork itself. The pause glyph inside a band belongs to the
card arrangement, where the band holds the play.

**The item carries the mark, and the mark is the one thing a list could not say.** How much of a playlist is
not on disk is a fact about the object, and the sync line cannot carry it: a run that finished hours ago leaves
a playlist reading `Up to date` with four failed tracks. The mark is one pill in the item's actions row,
carrying the count of tracks whose file is not stored, toned by the worst reason present, with the breakdown of
reasons on hover and on focus. One pill however many reasons are missing, because two pills on one card read
as two facts about two things. It is `--text-xs` behind a hairline with no fill, so it reads on the tile's own
ground and on the raised ground the tile takes under the pointer, and it costs no height: it takes the leading
space of a row that was already there. A track whose source video was removed is not one of its reasons,
because a stored file whose video is gone is stored; the mark is about files.

The item carries the sync state, because the sync line is the header's and this screen draws headers. The
cost is paid for in `--tone-failed` on every tile.

There is no search, no sort, no filter and no pagination. Search is a permanent non-goal in the glossary and
the page size is `PageQuerySchema`'s default of 50, which is the API's business, so a gallery of more than 50
playlists is a gallery this screen cannot show all of. That is recorded as a known limit rather than solved
by inventing a control the glossary has ruled out.

## The header

A quiet title and one control. The title is "PlayLiberty", the app's own name rather than a word for the
list, at `--text-2xl` on web and `--text-lg` on mobile, the step the type scale names for screen titles. The
add control is the same 36px box in both, with a 44px target around
it on mobile. Its `plus` is `--icon-sm` and `aria-hidden`, paired with the `--text-sm` label: at `--icon-md`
the ink is 1.36 times the cap height beside it, at `--icon-sm` it is 1.09, which is the pair the menu items
already use. There is no playlist count in the header, because a count of playlists is a standing total
rather than a fact about a row. "Add a playlist" appears twice on the empty screen, once in the header and
once on the gallery, and the two never coexist with a list.

## The loading state is the gallery's shape

Before the first playlist arrives the page draws the gallery it is about to hold rather than a sentence about
waiting. **Eight tiles in the same grid**, each a square cover box and the three lines the tile draws under
it, **16px** of name bar, **12px** of sync line and **12px** of count line, so the read resolves into the space
the skeleton held and nothing on the page moves when it lands. Eight because that is what fills the 1056
column's first screen at four columns and two rows, and the geometry is the item's: the same
`repeat(auto-fill, minmax(232px, 1fr))` track and the same `--space-4` gaps, so the skeleton is the gallery's
shape rather than a second thing to keep in step. The shapes hold `--surface` on `--bg`, the step the track
list's own surface takes, and they pulse once over **1.6s**; reduced motion drops the pulse and leaves the
shape, and the shape is the part that matters. The shapes are `aria-hidden` and the only thing a screen reader
hears is the status sentence "Loading playlists.", which is why the sentence is still on the page and off
screen rather than gone.

## The failed read offers a way back

A blocking read that fails is not a dead end. The library draws the server's own `detail` when the error
carries one, the fallback sentence "Playlists could not be loaded." when it does not, and one secondary
**Try again** that refetches the playlists read and nothing else. On success the failure is replaced by the
real content, the list or the empty gallery, and no reload moves the page: it is one manual press, never an
automatic retry or a timer.

The control is a real button, so it is reached and pressed by keyboard and announced by its own word rather
than by an icon. The same surface serves the playlist detail's tracks read and the share dialog's reads,
which is why it is one component and not three sentences; the dialog's retry refetches both of its reads,
because either one failing is the same dead end. This is the fourth of the screen's states, beside loading,
the empty gallery and the list, and it is the one that keeps the promise that a transient fault is a press
away from the music rather than a wall.

## The empty gallery

A different component from the playlist empty state, and not a variant of it. That one's action is
`Sync now`, because a playlist that exists and has no tracks has never been synced; this one's action is
`Add a playlist`. Drawing the other would tell a person with no playlists at all to sync something. It has
its own [record](../components/empty-gallery.md) and is drawn at both widths on the library's specimen.

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

**The page pays for the bar at its own end.** The gallery is an overlay under a docked bar, so the page
carries the bar's **97px** in its bottom padding plus the **20px** it keeps under its last row of tiles, the
same step the header uses above the gallery. An **88px** allowance is a breathing room and not a clearance: it
leaves the last row **9px** behind the bar at full scroll. The playlist detail docks the same bar and carries
the same clearance.

What the arrival costs is named rather than argued. On web the 1056 column's first screen holds two rows of
four tiles at 1280x900, and the docked bar's 97px leaves the second row half behind it; on mobile the content
area is **788px** at rest and **691px** with the bar docked, so the bar costs two of the six cards the person
could see, four surviving. Nothing about the bar changed; the unit this screen counts in did, three times, and
each time the answer had to be re-measured rather than carried over. The 610px budget in the ticket is the
detail screen's (844 less a 136px playlist header and a 98px bar) and it does not apply to the mobile half
here: this screen has the first as its items rather than above them, and its content area is 788px, 178px
more.

## Signed out, on mobile only

The state replaces the content area rather than sitting over it, because signed out no other resource in the
app is reachable and there is nothing behind it to dim. Web has no signed-out state at all, and that is not
an omission: the edge authenticates the browser before the SPA is ever loaded. It is a sentence and no
control: the server fails closed with `401 unauthenticated` when the edge headers are missing and
[the architecture section](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers) records that the app runs no login, so
a button could only open a flow no ticket or contract has decided.

## Figures, and the width each came from

|                              | at 1056, web                                | at 390, mobile                    |
| ---------------------------- | ------------------------------------------- | --------------------------------- |
| header                       | 78.4px                                      | 56px, title only                  |
| the component                | the playlist header                         | the playlist header               |
| item                         | the tile, 252x396px                         | not used                          |
| the grid                     | 4 columns, `--space-4` gap                  | 2 columns, `--space-3` gap        |
| card, one per row            | not used                                    | 436.8px, superseded               |
| card, in the grid            | not used                                    | 172.2px wide, 223.6 or 247.3px    |
| the header's own card        | not used                                    | 468.8px, full-bleed               |
| cover                        | 236px, square                               | 140.2px, square                   |
| name                         | `--text-xl` semibold                        | `--text-lg` 20px semibold         |
| the name's column, at rest   | about 190px of text                         | 112.2px of text                   |
| the name's column, playing   | about 190px, unchanged                      | 112.2px, unchanged                |
| the share indicator          | 20px, beside the name                       | 20px, at the row's right edge     |
| actions row, at rest         | under the cover: mark, shuffle, overflow    | not used: the band is the picture |
| on the picture, at rest      | not used                                    | the play, 48px of 108.2           |
| on the picture, playing      | not used                                    | the pause, the same 48px          |
| the transport                | not drawn                                   | not drawn                         |
| the top left of the picture  | not used                                    | the shuffle, 32px, inset 24px     |
| the two controls' centre     | not used                                    | one axis, 40.8px from the left    |
| below the cover              | the mark, the shuffle and the overflow      | not drawn: no overflow on a card  |
| the control band             | not used                                    | 80px, 57.1% of the cover          |
| the band at one card per row | not used                                    | 80px, 24.7% of a 324.4px cover    |
| the status line              | under the name, with a time, then the count | count left, state right, 1 or 2   |
| the status line's two facts  | state, time, count, 3 lines                 | 148.4px needed, 140.2px of column |
| the status line's alignment  | the header's `.meta` is centred             | `baseline`, 0px apart             |
| the separator                | a middot                                    | none: the gap is the separator    |
| the gap on a full line       | not used                                    | 8px, the floor                    |
| the gap on the emptiest      | not used                                    | 52.62px                           |
| the count's unit word        | `tracks`                                    | kept, wraps on a four-figure one  |
| the picture that is the link | not used                                    | 63% of a resting card, was 27%    |
| the add control              | a labelled button, 152.4px wide             | a 56px FAB, no visible word       |
| the add control's position   | in the header's right                       | bottom right, --space-4 inset     |
| the add control, bar docked  | not applicable                              | 113px up, clearing the bar by 16  |
| the add control's clearance  | not applicable                              | 88px, 185px with the bar          |
| the add control's glyph      | `plus` at --icon-sm beside text             | `plus` at --icon-lg, 50% of it    |
| the add control's tier       | not applicable                              | `--z-sticky`, under the scrim     |
| content area                 | not a phone budget                          | 788px at rest, 691px with the bar |
| whole items above the fold   | 8 tiles at rest, 4 with the bar             | 6 cards at rest, 4 with the bar   |
| rows above the fold          | 2 at rest, 1 with the bar                   | 3 at rest, 2 with the bar         |
| empty gallery                | 220px tall                                  | 244px tall                        |
| add dialog                   | 400 by 255.6px                              | 388.4 by 234.8px, as a sheet      |
| signed out                   | not drawn                                   | 356.4 by 180px                    |

**Every text pairing here is one the token set already declares.** The name is `--ink` on `--bg` at
15.94:1, the count is `--muted` on `--bg` at 6.18:1, the dialog's heading is `--ink` on `--surface-raised`
at 13.42:1 and its body is `--muted` on the same at 5.20:1, the add button's legend is `--bg` on `--accent`
at 5.85:1, and the row's focus ring is `--accent` at 5.85:1 on `--bg`. The rows sit on `--bg` and not on
`--surface`, which is the track list's own arrangement, so the two lists in this product are the same
object.

**Truncation is on both arrangements, and the web tile cuts harder than the row did.** At `--text-xl` the
sixth item's 78-character probe name measures **923px** against the row's 848px column, so it was cut before
this ticket too; on a tile the name's column is **about 190px**, which is some **eighteen characters** at that
size, and four of the six development fixtures are cut. The full name is not lost to the cut: it rides in the
name element's `title`, so a truncated line is recoverable by pointer without opening the playlist. On the
mobile card the column is 140.2px, of which the share indicator takes 20px and the row's own `--space-2` gap
takes 8px, leaving 112.2px of text, some ten characters at `--text-lg`, where one card per row fitted 27.

## What is not drawn

Search, sort, filter and pagination. The
equalizer strip on a card, which its own size cannot carry. **There is no queue panel**: the
answer is that the track list is the queue, so there is no panel and no trigger to open one. The playlist
detail itself is
[`17-design-the-playlist-detail`](../../tracker/tasks/17-design-the-playlist-detail.md).
