# 31: The library at phone width is a card grid

**Blocked by:** None.
**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library's item is the header's **tile** above its 767px breakpoint and the header's **card** at it and
below, where one tile per row is a playlist per screen. The card is a door and it plays: the picture is a
link with the name beside it, the band holds the play that starts the playlist and becomes the pause while it
is the queue, the shuffle sits on the picture's top-left corner, and the count and the sync state share one
line with the name one type step down. The mark ends the name row. The add control becomes a floating round
button at that width, which is what lets the header spend its height on the title.

**The width picks the arrangement in the page.** [`LibraryPage`](../../../apps/web/src/views/library/LibraryPage/LibraryPage.tsx)
reads `MOBILE_QUERY` once, hands each item its arrangement and the skeleton the same one, and the item
([`PlaylistItem.tsx`](../../../apps/web/src/views/library/PlaylistItem.tsx), `PlaylistTile`'s replacement)
renders one arrangement rather than both, as the detail already does with its row and card. The grid is
`repeat(auto-fill, minmax(172px, 1fr))` with `--space-3` gaps below 767: 172px is the card's own width, so
**390 is the two 173px columns** the record's mobile half was measured in and 767 takes four of 174.75px
rather than two of 361.5px.

**The card's item variant is one flag on the arrangement.**
[`PlaylistCardHeader`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistCardHeader.tsx) takes
`item`, and everything the hero does not do hangs off it in
[`PlaylistHeader.module.scss`](../../../apps/web/src/shared/components/PlaylistHeader/PlaylistHeader.module.scss):
the picture's link (a sibling inside the picture, `aria-hidden` and untabbable, so one link is announced per
item), the shuffle on the picture, the band with the play alone, the name's step to `--text-lg`, the status
line and the four `min-width: 0` declarations the grid asks for. The band's padding is `--space-2` and
`--mactions` is 64px with it, so the play sits **9,9px** from the picture's corner and the scrim covers
**45.4%** of a 141px picture rather than 57.1%, which is the figure the record already calls the cost of the
grid.

**The band holds one control and the mark ends the name row.** The mark was in the band beside the play,
which cost the play the picture's own corner; with it out, the picture's inset is the band's own. The seam
draws the mark at the end of the name row ([`usePlaylistHeader`](../../../apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx)
takes it as a slot and the tile keeps its own copy in its actions row), and the name is what pays: its column
is **56.1px of text** rather than 112.2, about five characters at `--text-lg`, so three of the six
development fixtures are cut. The alternatives are recorded in
[`library.md`](../../design-system/screens/library.md) and were not taken.

**The breakdown hangs from the edge the mark is anchored to and cannot leave the frame.**
`IncompleteBadge` takes `tipEdge`, so a mark at a row's end turns its panel around and sizes it to its
content: a 180px column hanging from the corner of a card's 141px identity leaves the frame, which is what the
first version did at 390. Both panels, this one and the share mark's, are also bounded by the frame and break
their own words rather than spilling, so no catalog's label can push one out. Measured on every mark at 390,
480, 600, 767, 768 and 1280: inside on both edges.

**The status line is one seam option.** `statusLine` groups the count and the state that the seam already
built for the row's stacked identity, so the two arrangements cannot drift on what a playlist says; it
carries no elapsed time, because the line holds two facts.

**The play is a library action.**
[`useStartPlaylist`](../../../apps/web/src/shared/player/useStartPlaylist/useStartPlaylist.ts) is
`useShufflePlaylist` grown to own both modes: `playPlaylist` starts the playlist in its own order,
`shufflePlaylist` keeps its behaviour, and both share one read and one refusal, so a card with nothing stored
says the same sentence the shuffle's press makes. While the queue is already this playlist's the play pauses
and resumes it rather than restarting it. The refusal's copy moved from `shuffle.*` to `start.*`, because it
is the action's and not the shuffle's.

**The add control is one component at two widths and two screens.**
[`FloatingAction`](../../../apps/web/src/shared/components/FloatingAction/FloatingAction.tsx) is the 56px
circle on the frame's corner, inset `--space-4`, at `--z-sticky`, clearing the docked bar by 113px, with the
label on `aria-label` and `--icon-lg` in the box, and it reads the queue itself for the one thing about its
surroundings that moves it. The library and the playlist detail both use it, because the two differ in the
label and in nothing else: the library hides it on the empty gallery, whose own action is a framed button,
and the detail hides it from a reader who may not write, which is the same rule its overflow follows. Each
page pays for its clearance in its own bottom padding, both of them **185px** with the bar. The library's
header is **56px** at the phone width, `--space-3` around a 32px language control and a `--text-lg` title, and
the detail's way-home row gives up the labelled button there, so the row holds the way home alone. The
full-width sheet and the signed-out state stay the mobile client's: this is the web's, and the web has no
signed-out state to draw.

**Verified.** `pnpm run build`, `pnpm run lint`, `pnpm test:unit` (web 449, server 360, packages 79),
`pnpm test:e2e` (30) and `pnpm run design:check` pass. In the browser at 390: two 173px columns, a 56px
header, the FAB above the docked bar, the card's play starting the playlist and becoming the pause, the
picture and the name opening it, and the mark's breakdown on hover and on focus; at 1280 the tile is
unchanged with the mark still leading its actions row.
