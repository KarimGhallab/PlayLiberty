# 03: The pin on the cover

**Blocked by:** [`02`](02-the-pinned-section-and-the-menu-item.md).
**Status:** superseded

## Outcome

Superseded by [`02`](02-the-pinned-section-and-the-menu-item.md): the item's menu already carries Pin and
Unpin, so the product decided the pin is not drawn on the cover, and a control that appears on hover is noise.

The cover control was built first (a 32px `--scrim` box on the cover's top-right, hidden at rest and revealed
on hover and focus, toned by state) and then removed: the `PlaylistTileHeader` control, its
`header.pinPlaylist` / `header.unpinPlaylist` copy, the `PlaylistPinToggle` model and the
`@media (hover: none)` reveal are gone, and the tile is back to `02`'s shape. `usePlaylistActions` owns the pin
only as the menu item; the menu item, the failure notice and the pinned section are unchanged.

Verification at the reverted state: `pnpm test:unit` (server 373, web 468, i18n 39, youtube 31, ui-foundation
6, tokens 3), `pnpm run build`, `pnpm run lint` pass. Not committed.

The removal left one hole, now closed: with no cover control a read collaborator had no pin at all, because
`02` kept a reader's menu empty. The reader's overflow now carries Pin and Unpin alone, so `menu is enough`
holds for everyone the server lets pin. That change is in `02`'s outcome, and the spec follows
it.
