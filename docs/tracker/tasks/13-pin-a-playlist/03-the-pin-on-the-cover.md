# 03: The pin on the cover

**Status:** superseded

## Outcome

Superseded by [`02`](02-the-pinned-section-and-the-menu-item.md): the item's menu already carries Pin and Unpin, so the product decided the pin is not drawn on the cover, and a control that appears on hover is noise. The cover control was built first (a 32px `--scrim` box on the cover's top-right, hidden at rest and revealed on hover and focus, toned by state) and then removed, so the `PlaylistTileHeader` control, its `header.pinPlaylist` / `header.unpinPlaylist` copy, the `PlaylistPinToggle` model and the `@media (hover: none)` reveal are gone, and the tile is back to `02`'s shape, with `usePlaylistActions` owning the pin only as the menu item. With no cover control a read collaborator had no pin at all, because `02` kept a reader's menu empty, so the reader's overflow now carries Pin and Unpin alone and `menu is enough` holds for everyone the server lets pin.

See [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md).
