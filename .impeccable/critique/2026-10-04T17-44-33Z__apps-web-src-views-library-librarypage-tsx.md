---
target: the library page
total_score: 29
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: 'file:/mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/library/LibraryPage.tsx'
target_fingerprint: 'sha256:0525bc3a54985fa74696754d78d613f4097566a773b88c6d06de39ce188c1441'
target_path: /mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/library/LibraryPage.tsx
timestamp: 2026-10-04T17-44-33Z
slug: apps-web-src-views-library-librarypage-tsx
---

# Design Critique: PlayLiberty library (`/`)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                                                   |
| --------- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 3         | Sync state is excellent (word + dot + cover edge), but nothing marks which playlist is playing; every row stays `data-state="paused"`.                      |
| 2         | Match System / Real World       | 4         | "Synced 4 hours ago", "Private playlist", "Shuffle" all map cleanly to the model; no invented jargon.                                                       |
| 3         | User Control and Freedom        | 3         | Escape / Cancel / scrim exit, and the deferred delete is cancellable, but a second delete silently replaces the first and a running sync cannot be stopped. |
| 4         | Consistency and Standards       | 2         | The same `PlaylistHeader` drops its play control here, contradicting the component record and the detail screen.                                            |
| 5         | Error Prevention                | 3         | Inline refusal, field disabled while working, deferred delete; but Delete is one menu item away with only a 6s toast as the guard.                          |
| 6         | Recognition Rather Than Recall  | 3         | Three share glyphs whose meaning is a hover-only tooltip; on touch the semantics are unreachable.                                                           |
| 7         | Flexibility and Efficiency      | 2         | No way to start a playlist from the gallery; playback always costs a navigation into the detail.                                                            |
| 8         | Aesthetic and Minimalist Design | 3         | Disciplined and calm, but a lone column above a large dead field with a bottom-anchored bar reads empty rather than composed.                               |
| 9         | Error Recovery                  | 3         | Rows name the failure and offer "Sync now", but diagnosis and retry live one screen away.                                                                   |
| 10        | Help and Documentation          | 3         | Inline copy explains the promise and the dialog; no persistent explanation of the share glyphs.                                                             |
| **Total** |                                 | **29/40** | **Good**                                                                                                                                                    |

## Design Specificity Verdict

**Grounded in the data model, cautious in the composition.** The vocabulary is unmistakably this product: sync state words ("Up to date" / "Sync failed"), "Synced 4 hours ago", "5 tracks", the lock / lock-share / user-share indicators, and id-derived sleeves for no-artwork covers. An unrelated product would have to rewrite all of that copy to reuse the screen. But the composition is a generic shell: a centred single column under an app-name header, one green CTA top-right, a fixed bottom player. There is no visual gallery on web. The mobile record promises six cards above the fold and a wall of sleeves; the web library is a one-column settings list where covers are 96px thumbnails and three rows float above a large void. The specificity lives in the semantics, not in the form. Remove the sync line and the sleeves and this is a to-do list.

**LLM assessment**: specific to PlayLiberty's _model_, generic in its _composition_. It reads as a dependable list, not as a personal gallery.

**Deterministic scan**: the bundled detector returned **0 findings, exit 0** across the library markup bundle (`LibraryPage.tsx`, `PlaylistListItem.tsx`, `EmptyGallery.tsx`, `AddPlaylistDialog.tsx`, `PlaylistHeader.tsx`, `UndoToast.tsx`). Validity was confirmed with positive controls (a `PlayerBar.module.scss` scan returns exit 2 for `layout-transition`). The browser runtime overlay reported "2 anti-patterns", both `layout-transition transition: width`; one is the real `_player-bar__fill_` element, the second is a body-level duplicate. Neither is in the library-page bundle. No CLI false positives.

**Visual overlays**: the overlay injection succeeded; the findings above are what the console reported. The overlay is coarse (body-level attribution), which is why one real source was emitted twice.

## Overall Impression

A calm, disciplined, semantically rich library that is held back by two structural choices: the entry screen omits the one control that starts content (play) while carrying a control that is not the row's (shuffle), and it has no visual anchor for "what is playing" even while the player bar plays from it. The strongest work is the state encoding (sync word + dot + cover hairline + deterministic sleeve) and the honest deferred-delete window. The biggest opportunity is to make the item behave like the component the design system already specifies.

## What's Working

1. **Sync state is redundantly encoded and survives its own constraints.** The state is a word, a 7px dot, and the cover's hairline tone, read from one element so they cannot disagree. Reduced motion kills the dot's pulse and the word remains; colour blindness leaves the word and the dot. This is the strongest decision on the page.
2. **Sleeves break the grey wall deterministically.** `sleeveIndex(playlist.id)` gives each no-artwork playlist a stable hue, and the six skip accent green and the state amber/red so identity never reads as action or fault.
3. **The deferred-action primitive is honest.** `useDeferredAction` commits only on timeout, Cancel is a true no-op rather than a compensating write, and one window per page means two deletes cannot silently stack.

## Priority Issues

**[P1] The library rows have no play control and no now-playing marker.**

- **What**: `PlaylistListItem` never passes `onPlay`, so `PlaylistHeader` renders no play control; `playing`/`current` are also unset, and every row stays `data-state="paused"`.
- **Why it matters**: playlists are the only entry point to content and this is the landing route, yet starting a playlist costs a navigation into the detail page. The equalizer strip that the record calls "the only thing that says which playlist is playing" can never render here, so the gallery has no "now" anchor even while the bar plays from it. It also contradicts the component's own contract.
- **Fix**: pass `onPlay`, `playing`, and `current` from the item and render the play button and strip as the detail header does. If the omission is deliberate, retract the claim in `docs/design-system/components/playlist-header.md` and `screens/library.md` so the contract matches reality.
- **Suggested command**: `$impeccable shape`

**[P1] Global shuffle is drawn as a per-row toggle.**

- **What**: every item renders `aria-pressed={shuffled}` wired to the single player-store shuffle, so all rows share one value; pressing shuffle on one row lights it on every row.
- **Why it matters**: the control's placement says "this playlist", its behaviour says "the player". A user cannot tell whether the toggle belongs to the row, the queue, or the app, and turning it on makes N toggles claim a state none of them own.
- **Fix**: remove shuffle from the row and keep it on the player bar and the detail header, or relabel it as a player-level control rendered once.
- **Suggested command**: `$impeccable shape`

**[P2] Repeated controls carry context-free accessible names.**

- **What**: every row exposes `aria-label="Shuffle"` and `aria-label="More actions"`, and the share indicator is `role="img"` labelled "Private playlist". None include the playlist name.
- **Why it matters**: a screen reader hears "Shuffle, button" and "More actions, button" N times with no way to associate each with its row. At 50 playlists that is 100 indistinguishable controls.
- **Fix**: append the playlist name to each control's accessible name, or scope the buttons to the row with `aria-labelledby`.
- **Suggested command**: `$impeccable audit`

**[P2] Modal dialogs are not focus-trapped.**

- **What**: `Dialog.tsx` sets `role="dialog"` and `aria-modal="true"`, focuses `initialFocus`, and handles Escape, but implements no focus trap.
- **Why it matters**: Tab from the Add button leaves the dialog and walks the page behind it, contradicting `aria-modal` and stranding keyboard users in content a modal claims is inert.
- **Fix**: cycle Tab/Shift+Tab among the dialog's focusables and restore focus to the opener on close.
- **Suggested command**: `$impeccable audit`

**[P3] Documented mobile and copy behaviour does not match the web client.**

- **What**: at 390 the library renders the desktop row list, not the documented two-column card grid with a floating action button; the Add dialog is a centred card, not a full-width sheet; and a non-YouTube URL is refused by the server with a generic message rather than the host-naming client message the record specifies.
- **Why it matters**: if 390 is a supported web width, the documented mobile experience does not exist; the design system is the stated source of truth and drift erodes that trust.
- **Fix**: decide whether the web client owns 390; if yes, implement the grid/FAB/sheet; if no, annotate the records with the client boundary and align the refusal copy.
- **Suggested command**: `$impeccable adapt`

## Persona Red Flags

**Sam (accessibility-dependent / keyboard)**

- Repeated `aria-label="Shuffle"` / `"More actions"` with no playlist context.
- No play control on any row: Sam cannot start audio from the library without navigating into a detail page.
- The share indicator's meaning is a `display:none` hover-only tooltip; with no pointer the only signal is the generic "Private playlist" label.
- The delete toast is `role="status"`, not focused: a polite announcement, then a Tab to reach Cancel inside a 6s window.
- Modal focus escapes into the page behind the dialog.

**Casey (distracted mobile)**

- At 390 the row is tall with a 96px cover and only shuffle and overflow; no direct play from the card.
- The delete confirmation is a bottom-left toast above the docked bar, away from the thumb zone and easy to miss while scrolling, and it auto-commits.
- The header is not sticky, so "Add a playlist" scrolls away on a long list.
- The share glyph has no touch-accessible explanation.

**Riley (edge-case stress tester)**

- A long playlist name truncates with `text-overflow: ellipsis` and no `title`, so the full name is unreadable on web.
- The page caps at 50 with no pagination or "more" affordance: playlist 51 is invisible with no signal it exists.
- Deleting two playlists within the 6s window silently drops the first, because `defer` replaces the pending action.
- A failed row offers "Sync now" but no inline detail; the explanation is on another screen.

## Minor Observations

- The library's bottom padding is `calc(--space-9 + --space-8)` = 88px, but the docked player bar is ~97px, so the last row can sit behind the bar when scrolled to the end.
- The count ("5 tracks") is a separate line from the meta line at `--text-xs`, so the total reads as a near-footnote rather than a fact.
- The loading state is the bare string "Loading playlists." with no skeleton.
- Dividers use `&__item + &__item`, so the last row has no bottom rule and the list ends with a hard edge against the void.
- The refused-create message renders at 12px in muted red, quieter than the dialog body above it; easy to skim past.
- Failed rows say the fault three ways at once (dot, word, cover hairline); the docs defend two, three starts to read as alarm.
- The hover/cursor affordance on the row is correct (`[data-open='true']` sets pointer and `--surface-raised`), and `focus-within` extends it to the keyboard.
- The Add dialog at 390 is a centred card, not the documented sheet; the scrim and focus handling are otherwise correct.

## Questions to Consider

1. If the playlist is the only entry point to content, why does the item on the entry screen omit the one control that starts content, while keeping a toggle (shuffle) that does not belong to the row?
2. Shuffle belongs to the player, not the playlist. What does a lit shuffle button on one row mean while another playlist is playing, and why is that answer different on every row?
3. The product's whole promise is that a track survives a removed video. The library shows count and last-synced but never "what is playing". Where is the visual anchor for the one thing an audio player is for?
4. With no search, no sort, and a silent 50-item page cap, what is the intended experience at 51 playlists, and what tells the user the gallery is truncated?
