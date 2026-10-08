# 17: Split the playlist header into a row module and a card module

**State:** `resolved`
**Category:** `enhancement`
**Blocked by:** 16. The actions extraction restructures the same module first, so the split does not move the menu and the dialogs a second time.

## Outcome

Done. The one `arrangement` prop is gone; each arrangement is its own module over a shared seam.

- `usePlaylistHeader` is the shared seam. It owns the cover's source and failure fallback, the sleeve, the ground, the identity block (name, share mark, state, optional sync time, count, owner line) and the menu model, plus the play, transport and shuffle controls. It returns `sleeve`, `cover`, `onCoverError`, `ground`, `primaryControl`, `shuffleControl`, `menuControl` and `identity`, so the identity fragment is drawn once.
- `PlaylistRowHeader` is the row. Its interface is `PlaylistHeaderSeam` plus the row's own `onOpen`; it also honours `showSyncTime` and `now` from the seam. It owns the cover link with the playing bars and the row's click-to-open.
- `PlaylistCardHeader` is the card. Its interface is `Omit<PlaylistHeaderSeam, 'showSyncTime' | 'now'>`: no `onOpen`, no elapsed line, the two props the row owns. It owns the cover block, the scrim and the action band.
- The library imports `PlaylistRowHeader`; the detail imports both and picks by `isMobile`, handing each the same props from one named set. The detail never passed the row-only props, so the card's rendered result is unchanged: the dropped `data-open` was already absent there.
- One correction to the brief: `heading` and the transport props are honoured by both arrangements, because the detail draws the row on mobile as well as the card on the web. They stay in the shared seam rather than moving to the card; only `onOpen`, `showSyncTime` and `now` are the row's alone.

Tests: `PlaylistHeader.test.tsx` now renders through `renderRow` and `renderCard`, so each arrangement is exercised through its own module. The card's eager cover, its ground and the transport tests go through `renderCard`; the rest go through `renderRow`.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 372, server 281, i18n 39, ui-foundation 6, youtube 22, tokens 3) pass. Not committed.
