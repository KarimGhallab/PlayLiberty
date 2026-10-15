# Focus and layout

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

The focus ring is the accent at `--focus-width` 2px with a `--focus-offset` 2px, so it reads on every
surface including the raised one at 4.92:1. The ring colour is `--accent` and deliberately not a second
token, so the accent cannot be changed in one place and not the other.

Four stacking levels and no more, so a z-index argument never happens: `--z-base` 0, `--z-sticky` 10,
`--z-player` 20, `--z-overlay` 30. The docked bar is the third level and the overlays are the fourth, which is
the order the two are met in: the bar is chrome the app keeps on screen, and an overlay is what the reader has
just opened, so a playlist's action menu opened near the foot of the screen covers the bar rather than being
cut off by it. Notices sit one above the top tier, at `--z-overlay` + 1, because they are the one thing that
outranks what the reader is in the middle of doing.

Single column on mobile, no fixed chrome on web, a comfortable reading width, and a persistent player
bar anchored to the bottom. There is no web sidebar: the library is
the only entry point to content, and a permanent column holding a household's handful of playlists
costs every screen its width to save a navigation step. Mobile has no bottom bar for the same kind of
reason, and for a measured one, since a 56px bar would take the detail's 8 rows down to 7. So the
library is a route on both clients and nothing is permanently on screen except the player bar.

The screen inventory is settled in
[`13-settle-the-screen-inventory`](../tracker/tasks/13-settle-the-screen-inventory.md) and no screen is
drawn yet, so this section still describes intent. The one thing here that is measured rather than
intended is the bar's own height and what it costs the list under it, and that is under Components: a
bar anchored to the bottom gives none of its height back, so its height is a cost to the list rather
than a property of the bar.
