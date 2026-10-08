# 17: Split the playlist header into a row module and a card module

**State:** `resolved`
**Category:** `enhancement`

**Blocked by:** 16. The actions extraction restructures the same module first, so the split does not move the menu and the dialogs a second time.

## Agent Brief

**Category:** enhancement
**Summary:** The playlist header is one module with one `arrangement` prop that selects between two render bodies, and its interface carries props only one body honours, so a caller cannot tell from the type which props the chosen body uses.

**Current behavior:**
The header takes an `arrangement` of `row` or `card` and branches to one of two markup trees. The two trees share the identity fragment and the prebuilt controls but little else: the row's cover is a link with the playing bars, the card's cover is a block with a scrim and the actions on it. The interface carries arrangement-only props (`onOpen` and `showSyncTime` are row-only; `heading`, `onSkipBack`, `onSkipNext` and `hasNext` are card-only), and the root element's attribute set is written out twice.

**Desired behavior:**
Two modules, a row header and a card header, each with an interface that carries only the props its arrangement honours. A shared identity seam owns what both draw: the cover, the identity block and the menu model. The rendered result and the behaviour are unchanged on both surfaces.

**Key interfaces:**

- The shared seam exposes the cover, the identity block and the menu model; each arrangement composes it.
- The row module's interface drops the card-only props; the card module's interface drops the row-only props.
- The menu model comes from issue 16's module, so the header does not own the access rule.

**Acceptance criteria:**

- [x] Two header modules exist, each carrying only the props its arrangement honours.
- [x] The shared identity fragment is drawn once, not duplicated between the two.
- [x] The library row and the detail card render and behave exactly as today.
- [x] The header test exercises each arrangement through its own module.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The action rule and the menu model (issue 16).
- The styles, which keep their current shape.

## Outcome

Done. The one `arrangement` prop is gone; each arrangement is its own module over a shared seam.

- `usePlaylistHeader` is the shared seam. It owns the cover's source and failure fallback, the sleeve, the ground, the identity block (name, share mark, state, optional sync time, count, owner line) and the menu model, plus the play, transport and shuffle controls. It returns `sleeve`, `cover`, `onCoverError`, `ground`, `primaryControl`, `shuffleControl`, `menuControl` and `identity`, so the identity fragment is drawn once.
- `PlaylistRowHeader` is the row. Its interface is `PlaylistHeaderSeam` plus the row's own `onOpen`; it also honours `showSyncTime` and `now` from the seam. It owns the cover link with the playing bars and the row's click-to-open.
- `PlaylistCardHeader` is the card. Its interface is `Omit<PlaylistHeaderSeam, 'showSyncTime' | 'now'>`: no `onOpen`, no elapsed line, the two props the row owns. It owns the cover block, the scrim and the action band.
- The library imports `PlaylistRowHeader`; the detail imports both and picks by `isMobile`, handing each the same props from one named set. The detail never passed the row-only props, so the card's rendered result is unchanged: the dropped `data-open` was already absent there.
- One correction to the brief: `heading` and the transport props are honoured by both arrangements, because the detail draws the row on mobile as well as the card on the web. They stay in the shared seam rather than moving to the card; only `onOpen`, `showSyncTime` and `now` are the row's alone.

Tests: `PlaylistHeader.test.tsx` now renders through `renderRow` and `renderCard`, so each arrangement is exercised through its own module. The card's eager cover, its ground and the transport tests go through `renderCard`; the rest go through `renderRow`.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites (web 372, server 281, i18n 39, ui-foundation 6, youtube 22, tokens 3) pass. Not committed.

## Observed

- `PlaylistHeader.tsx`: `arrangement?: 'row' | 'card'`, one branch, two return blocks, the root attributes written twice.
- The interface lists arrangement-only props.
- `PlaylistHeader.test.tsx` selects bodies by class-name substrings and element order.

## Expected

Each arrangement is its own module with an interface that names only its own props, over a shared identity seam.

## Evidence

- `PlaylistHeader.tsx`: the `arrangement` branch and the two return blocks.
- Architecture review, candidate 2, "Split the arrangement prop into two modules".
