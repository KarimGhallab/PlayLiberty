# 02: The gallery draws the playlists

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The library route is now the gallery. `Screen` takes an optional title, so the route draws no second heading, and `LibraryHeader` carries the app's name as the screen heading beside the account door and the admin's egress door. The route passes the API config and the playlist route's push to `PlaylistGallery`.

The gallery reads the paged playlist route through `usePlaylists` and the account directory through `useAccountDirectory`, with `ownerNameFrom` resolving the owner line. The items are grouped pinned first, then unpinned first-sync playlists, then the rest; an empty group draws no heading. The grid is two columns.

The card draws the cover, the name, the owner line only for a shared playlist, the count, the sync state word, the share mark, the incomplete count and a disabled play control named for its playlist. The whole card opens the playlist. The card is one accessible door labelled with its name; the visual content is hidden from the accessibility tree, and the play is a separate disabled control.

The cover seam falls back from the custom cover, to the first track's thumbnail, to the playlist's sleeve hue, and each image request carries the session's token headers. The six sleeve names moved into one `sleeveColor` helper, which the account sheet's monogram now shares.

The card's tests cover the cover chain and headers, the disabled play, the owner line, the incomplete count, the count and state, the share mark, and the single announced name with its navigation. The gallery's tests cover the three groups and their order, the empty group's absent heading, the owner line, the incomplete count, and the card's navigation.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
