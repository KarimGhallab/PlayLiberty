# Focus and layout

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

The focus ring is the accent at `--focus-width` 2px with a `--focus-offset` 2px, so it reads on every
surface including the raised one at 4.92:1. The ring colour is `--accent` and deliberately not a second
token, so the accent cannot be changed in one place and not the other.

Four stacking levels and no more, so a z-index argument never happens: `--z-base` 0, `--z-sticky` 10,
`--z-overlay` 20, `--z-player` 30.

Single column on mobile, no fixed chrome on web, a comfortable reading width, and a persistent player
bar anchored to the bottom. The web sidebar that used to be promised here is withdrawn: the library is
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
