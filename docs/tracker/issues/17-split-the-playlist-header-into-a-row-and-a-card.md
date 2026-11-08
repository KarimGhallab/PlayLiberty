# 17: Split the playlist header into a row module and a card module

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The one `arrangement` prop is gone; each arrangement is its own module over a shared seam. `usePlaylistHeader` is the seam, owning the cover's source and failure fallback, the sleeve, the ground, the identity block (name, share mark, state, optional sync time, count, owner line), the menu model, and the play, transport and shuffle controls, and returning `sleeve`, `cover`, `onCoverError`, `ground`, `primaryControl`, `shuffleControl`, `menuControl` and `identity`. `PlaylistRowHeader` is the row, its interface `PlaylistHeaderSeam` plus the row's own `onOpen` and its `showSyncTime` and `now`, owning the cover link with the playing bars and the click-to-open. `PlaylistCardHeader` is the card, its interface `Omit<PlaylistHeaderSeam, 'showSyncTime' | 'now'>`, owning the cover block, the scrim and the action band; the library imports the row and the detail imports both and picks by `isMobile`.
