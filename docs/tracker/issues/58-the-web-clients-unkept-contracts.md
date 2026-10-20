# 58: The web client's unkept contracts

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

Eight of the nine findings are fixed, seven in the pass that resolved this issue and item 2 in the pass that wrote it; the ninth, item 4, is [`33-the-touch-targets-and-the-phone-width`](../tasks/33-the-touch-targets-and-the-phone-width.md), resolved with its own outcome. The brief below is kept rather than dropped as the convention has it, because this issue was written and closed in one uncommitted pass, so git holds no other copy of the audit it records.

- **Item 1.** `Dialog.module.scss` bounds `.dialog` to `calc(100dvh - var(--space-4) * 2)` and makes it a flex column whose one scroll region is `dialog__content` (`min-height: 0`, `overflow-y: auto`, `overscroll-behavior: contain`), with the action row at `flex-shrink: 0`. The shell owns it, so every dialog gains it. `e2e/tests/curate.spec.ts` holds it at twenty writable playlists: the heading, the field and the Add are each `toBeInViewport` at 1280x720 and again after `setViewportSize(390x844)`. With the bound removed the test fails on the dialog's own heading leaving the viewport, which is the reported failure.
- **Item 3.** `useDismissibleMenu` owns the menu keyboard contract once for all four menus: the trigger's ArrowDown and ArrowUp open onto the first and the last item, the menu walks with the arrows and wraps at either end, jumps with Home and End and skips a disabled item, closes on Tab with focus back on the trigger, and keeps its older dismissal (a press outside without moving focus, Escape returning focus). The three widgets that lacked navigation take `tabIndex={-1}` on their items, an activated item puts focus back on its trigger, and the handler stops propagation, so the window's ArrowUp and ArrowDown no longer move the volume while a menu is open. `PlaylistHeader` lost its local copy of the handler with its `menuRef` and `menuFocusLastRef`. Nine hook tests own the mechanics and one wiring test per widget owns each menu.
- **Item 5.** Both gallery arrangements set `loading="lazy"`; the tile's `loading="eager"` is gone.
- **Item 6.** The dead restatements of the global kill are gone from eight stylesheets; the owners left are the global rule, the three spinner alternatives, the undo ring's colour, `Dialog.tsx`'s exit skip and the test helper that stubs the query. Six files no longer name `prefers-reduced-motion` at all.
- **Item 7.** `trackRow__menuItem` sets `font-family: inherit`.
- **Item 8.** The sort option's hover takes `var(--surface)`, the idiom the row's menu and the picker's row already use. No surface fill in `apps/web/src` is a raw literal; the nine left are six shadows, two artwork scrims and one alpha mask.
- **Item 9.** `docs/PRODUCT.md` now states the dark theme the clients ship, and `docs/DESIGN.md` exists again. It is written not to drift: it names roles and rules and never a literal, and it ends with where each kind of change belongs. Issue 47's retirement of the file is reversed for this one file.

## Agent Brief

**Category:** bug
**Summary:** The 2026-10-16 web-client audit (`/impeccable audit`, target `apps/web`) scored the client 16/20 and found nine places where it breaks a contract it states itself: an unbounded dialog, an inert font token, three ARIA widgets with no keyboard contract, three targets below the touch token, two eager image surfaces, a reduced-motion decision restated across ten stylesheets, one unreset control font, and one raw colour literal. The bundled detector reported no findings (`impeccable detect --json apps/web/src` returned `[]`), so every item below is a read of the source and none is a scanner hit.

**Current behavior:**

1. **P1, the dialog has no height bound and no scroll.** `Dialog.module.scss:6` is a fixed scrim with `display: flex; align-items: center` and no `overflow`, and `.dialog` (`:18`) sets `width: 400px` and no `max-height`; `AddTrackDialog.module.scss:9` does not bound the playlist list either. `AddTrackDialog` draws every writable playlist, so past roughly sixteen the dialog is taller than a 720px viewport: the title is clipped above, the Add button below, and nothing scrolls.
2. **P1, the type token is inert. Landed 2026-10-16, see `## Landed`.** `packages/tokens/src/values.ts:102` declares `font-ui: 'IBM Plex Sans'` and `base.scss:17` consumes it, but the client ships no `@font-face` and no font asset (`dist/` after a clean build has neither). `docs/design/fonts.css` and `docs/design/fonts/plex-sans-var-latin.woff2` were deleted with the specimens in `1b75831`, and that file records that the specimens measured the type scale in Plex with `font-display: block` so a size check was never judged against a fallback's metrics. Every screen therefore draws in the OS UI font, and the shipped `--text-*` scale is unvalidated in the face actually drawn.
3. **P2, three ARIA widgets declare a keyboard contract they do not implement.** `TrackRow.tsx:167` and `LanguageMenu.tsx:59` render `role="menu"` with no arrow-key handling and no focus move on open; `PlaylistSortControl.tsx:72` renders `role="listbox"` with `role="option"` buttons (`:78`) from a plain trigger that claims `aria-haspopup="listbox"` (`:51`). The roles promise arrow-key navigation and that Tab leaves the widget; in all three, Tab walks the items and the arrows do nothing. `usePlaylistHeader.tsx:226-270` already implements the contract (open onto first or last, ArrowUp/Down/Home/End, Tab closes, Escape returns focus), so one of four menus is correct.
4. **P2, three controls are below the touch target their own token names.** Actioned as [`33-the-touch-targets-and-the-phone-width`](../tasks/33-the-touch-targets-and-the-phone-width.md), which owns the fix and its verification. `VolumeControl.module.scss:12` draws a 36x36 mute (`:15-16`), `PlaylistSkipSetting.module.scss:20-21` is 40x22 (the label is a plain `<span>`, so the switch's drawn box is the whole target), and `TrackRow.module.scss:238`'s `__action` is 28x28 from `--control-size-inline`. Unlike `.playerBar__step`, `.playerBar__scrub` and `.volume__track`, none grows a no-paint hit box, and `--control-touch: 44px` (`packages/tokens/src/values.ts:69`) has zero uses in `apps/web`.
5. **P2, library covers load eagerly.** `PlaylistTileHeader.tsx:89` hard-codes `loading="eager"` and `PlaylistCardHeader.tsx:70` sets no `loading` at all, so the two arrangements behind the gallery are the two without lazy loading; `TrackRow.tsx:204` and `PlaylistRowHeader.tsx:75` are correct. Issue 13 is marked `resolved`, so this survived that pass.
6. **P2, the reduced-motion decision is restated across ten stylesheets.** `base.scss:27-35` already kills every animation and transition with `!important`. Ten component stylesheets carry a `prefers-reduced-motion` block, and eight of them repeat `animation: none` or `transition: none` that the global rule makes unreachable: `Dialog.module.scss:181`, `NoticeToast:65`, `PlaylistFilterChips:128`, `PlaylistSortControl:196`, `PlaylistHeader:1069`, `TrackRow:367`, `UndoToast:137`, `VolumeToast:92`. The two that contribute only a real alternative, `EmptyState:112` and `SyncError:143`, are the shape the others should take; `Dialog.tsx:95` makes the same call in JS for the exit phase.
7. **P3, `font-family` is not reset on the row's overflow menu items.** `TrackRow.module.scss:288`'s `__menu-item` is a `<button>` with a text label and sets `font-size` but not `font-family`, so Remove, Retry and Fetch whole can draw in the UA control face. Every other text-bearing button in the app sets `font-family: inherit`.
8. **P3, one raw colour literal stands in for a surface.** `PlaylistSortControl.module.scss:142` hovers an option to `rgb(255 255 255 / 0.06)`. The corpus's other literals are shadows, scrims and mask gradients with no token to name them; this one is a surface tint.
9. **P3, PRODUCT.md contradicts the shipped client.** `docs/PRODUCT.md:69` promises "sufficient contrast in light and dark" while `docs/ARCHITECTURE.md:121` records the web client as dark only and `index.html:6`, `site.webmanifest` and `base.scss:2` hard-declare dark. There is no `docs/DESIGN.md`, so the design values live only in code.

**Desired behavior:**

1. `.dialog` is bounded by the viewport (`max-height: calc(100dvh - var(--space-4) * 2)`) with the body scrolling and the action row reachable, so a long playlist list leaves the Add button on screen at 390px and at 720px height alike.
2. **Landed** (see `## Landed`): `--font-ui` resolves, the face is declared in `apps/web/src/shared/styles/base.scss` and the asset lives in `apps/web/src/assets/fonts/` so Vite hashes it into `/assets/`. The `font-family: inherit` gap of item 7 still stands.
3. The three widgets honour the roles they declare, by one owner rather than three: the header menu's key handling moves into `useDismissibleMenu` so all four menus open onto a focused item, walk with the arrows, close on Tab, and return focus on Escape; or the roles drop to plain buttons where the widget is not a menu.
4. Owned by [`33-the-touch-targets-and-the-phone-width`](../tasks/33-the-touch-targets-and-the-phone-width.md), which reaches `--control-touch` on the switch, the row overflow and the mute and adds the phone-width project. The unit suites stub `matchMedia`, so they assert the branch and never the stylesheet it selects, which is the blind spot item 1 shares.
5. Both gallery arrangements set `loading="lazy"`.
6. One owner for reduced motion: the global rule stays, each component block keeps only the alternative it contributes, and the dead `animation: none` / `transition: none` lines go.
7. The row menu items set `font-family: inherit`.
8. The hovered sort option uses a surface token.
9. `docs/PRODUCT.md` matches the recorded dark-only decision and the code-defined world is captured in `docs/DESIGN.md`.

**Key interfaces:**

- `Dialog`'s shell stays the one owner of a dialog's chrome; a height bound and a scroll region are added there, not per dialog.
- `useDismissibleMenu(options)` gains the menu key handling, so `TrackRow`, `LanguageMenu` and `PlaylistSortControl` stop hand-rolling dismissal and start sharing navigation.
- `PlaylistTileHeader` and `PlaylistCardHeader` keep their prop surfaces; only the `img` attributes change.
- `packages/tokens/src/values.ts` is the only owner of a token value; a font asset is a client concern and does not move into `tokens.css`.

**Acceptance criteria:**

- [x] `AddTrackDialog` with 20 writable playlists at 720px height and at 390x844 keeps its title, its field and its Add button on screen, with the list scrolling inside the dialog.
- [x] The first family in `--font-ui` either loads as a real font in the built client, or the token names a stack the client ships. No `--text-*` size is left calibrated against a face the client never draws without a note saying so.
- [x] `TrackRow`'s menu, `LanguageMenu`'s menu and `PlaylistSortControl`'s listbox each move focus on open, walk with the arrow keys, and leave focus on the trigger after Escape; Tab leaves the widget rather than walking its items.
- [x] The gallery's covers are `loading="lazy"` in both arrangements.
- [x] The reduced-motion decision is stated once; a grep for `prefers-reduced-motion` in `apps/web/src` returns the global rule plus only the blocks that contribute an alternative.
- [x] No text-bearing control in `apps/web/src` renders in the UA face.
- [x] No surface colour in `apps/web/src` is a raw literal.
- [x] `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` agree on the theme, and `docs/DESIGN.md` exists.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass, and `impeccable detect apps/web/src` still reports no findings.

**Out of scope:**

- The mobile client, which does not exist yet, and `apps/server`.
- Adding a light theme: `ARCHITECTURE.md` records dark only, so item 9 corrects the document rather than the code.
- The audit's two-dimension observations that need no change: contrast (every text pair clears 4.5:1, lowest 4.53:1) and focus design.
- Splitting the 548 kB single bundle. It is noted in the issue and is its own piece of work.

## Landed

- **Item 2, 2026-10-16.** `plex-sans-var-latin.woff2` is recovered from `1b75831^` into `apps/web/src/assets/fonts/`, verified byte-identical to the deleted blob (sha256 `e2291e84`). Vite emits it as `dist/assets/plex-sans-var-latin-*.woff2`, 45.71 kB, which nginx serves from `/assets/` with `max-age=31536000, immutable`; no CSP change is needed, `default-src 'self'` already covering `font-src`.
- The face is declared in `apps/web/src/shared/styles/base.scss`, beside the `font-family` that consumes it, at `font-weight: 400 600` with `font-display: swap`. The specimens' `block` was chosen to measure a scale without a fallback's metrics; the app must not render invisible text on a first visit instead. `--font-ui` resolves, so the shipped sizes are drawn in the face they were calibrated in.
- Open, for the human: the SIL OFL text this family ships under was never in this repository, so it is still absent.

## Observed

As the audit found it, before `## Landed`.

- `.scrim` has no `overflow` and `.dialog` no `max-height`; `AddTrackDialog` bounds nothing. WCAG 1.4.10.
- `--font-ui` names IBM Plex Sans; no `@font-face` and no font asset ship.
- `role="menu"` in two widgets and `role="listbox"` in a third carry no arrow-key handling; the header's menu carries all of it.
- 36x36, 40x22 and 28x28 targets sit where `--control-touch: 44px` is never used.
- `loading="eager"` on one gallery arrangement, absent on the other.
- Eight of the ten component reduced-motion blocks restate a global `!important` kill.
- `__menu-item` is a `<button>` without `font-family: inherit`.
- `rgb(255 255 255 / 0.06)` stands in for a surface.
- PRODUCT.md promises light and dark; the client, its manifest and its stylesheet declare dark only.

## Expected

- The dialog is bounded and scrolls, so its actions stay reachable at any viewport.
- The type token resolves to a font the client loads.
- Every declared ARIA role carries the keyboard contract it promises, owned once.
- Every interactive target reaches 44px or the token that promises it goes away.
- Repeated grid images lazy-load.
- Reduced motion has one owner plus the alternatives it needs.
- Form controls inherit the page font.
- Surfaces come from tokens.
- The docs state the theme the client ships, and the design values are documented.

## Evidence

- Audit run 2026-10-16, `/impeccable audit`, target `apps/web` (Impeccable `context` resolved platform `web`, PRODUCT.md inherited from `docs/PRODUCT.md`, no DESIGN.md).
- `pnpm run build` (clean): `dist/assets/index-C8jI_i18.js` 548.40 kB / 166.65 kB gzip, `index-CwlHPl9f.css` 77.88 kB / 11.01 kB gzip; Vite warns on the single chunk. No font file in `dist/`.
- `impeccable detect --json apps/web/src` returned `[]`, exit 0.
- Item 1: `apps/web/src/shared/components/Dialog/Dialog.module.scss:6,18` (`.dialog`'s `width: 400px` at `:19`); `apps/web/src/shared/components/AddTrackDialog/AddTrackDialog.module.scss:9`.
- Item 2: `packages/tokens/src/values.ts:102`; `apps/web/src/shared/styles/base.scss:17`; `apps/web/index.html`; `git show 1b75831^:docs/design/fonts.css`.
- Item 3: `apps/web/src/shared/components/TrackRow/TrackRow.tsx:167`; `apps/web/src/shared/components/PlaylistSortControl/PlaylistSortControl.tsx:51,72,78`; `apps/web/src/views/library/LanguageMenu/LanguageMenu.tsx:59`; `apps/web/src/shared/components/PlaylistHeader/usePlaylistHeader.tsx:226-270`.
- Item 4: `apps/web/src/shared/player/VolumeControl/VolumeControl.module.scss:12-16`; `apps/web/src/shared/components/PlaylistSkipSetting/PlaylistSkipSetting.module.scss:20-21`; `apps/web/src/shared/components/TrackRow/TrackRow.module.scss:238-242`; `packages/tokens/src/values.ts:69`.
- Item 5: `apps/web/src/shared/components/PlaylistHeader/PlaylistTileHeader.tsx:89`; `apps/web/src/shared/components/PlaylistHeader/PlaylistCardHeader.tsx:70-76`.
- Item 6: `apps/web/src/shared/styles/base.scss:27-35`, against the eight dead blocks in `Dialog.module.scss:181`, `NoticeToast.module.scss:65`, `PlaylistFilterChips.module.scss:128`, `PlaylistSortControl.module.scss:196`, `PlaylistHeader.module.scss:1069`, `TrackRow.module.scss:367`, `UndoToast.module.scss:137` and `VolumeToast.module.scss:92`, and the two alternative-only blocks in `EmptyState.module.scss:112` and `SyncError.module.scss:143`. `apps/web/src/shared/components/Dialog/Dialog.tsx:95` is the JS site.
- Item 7: `apps/web/src/shared/components/TrackRow/TrackRow.module.scss:288`.
- Item 8: `apps/web/src/shared/components/PlaylistSortControl/PlaylistSortControl.module.scss:142`.
- Item 9: `docs/PRODUCT.md:69`; `docs/ARCHITECTURE.md:121`; `apps/web/src/shared/styles/base.scss:2`.
- Not verified: no rendered viewport and no synthesized touch. The app needs a live API and Pangolin-injected `Remote-*` headers, and `e2e/playwright.config.ts:32` runs `Desktop Chrome` only, so the 390px arrangement, the touch gestures and the CSS at any width other than ~1280 are covered by no test. Items 1 and 6 are the findings that live in that blind spot, and ticket 33 closes it.
