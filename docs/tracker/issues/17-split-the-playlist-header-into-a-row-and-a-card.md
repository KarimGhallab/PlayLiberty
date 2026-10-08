# 17: Split the playlist header into a row module and a card module

**State:** `ready-for-agent`
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

- [ ] Two header modules exist, each carrying only the props its arrangement honours.
- [ ] The shared identity fragment is drawn once, not duplicated between the two.
- [ ] The library row and the detail card render and behave exactly as today.
- [ ] The header test exercises each arrangement through its own module.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The action rule and the menu model (issue 16).
- The styles, which keep their current shape.

## Observed

- `PlaylistHeader.tsx`: `arrangement?: 'row' | 'card'`, one branch, two return blocks, the root attributes written twice.
- The interface lists arrangement-only props.
- `PlaylistHeader.test.tsx` selects bodies by class-name substrings and element order.

## Expected

Each arrangement is its own module with an interface that names only its own props, over a shared identity seam.

## Evidence

- `PlaylistHeader.tsx`: the `arrangement` branch and the two return blocks.
- Architecture review, candidate 2, "Split the arrangement prop into two modules".
