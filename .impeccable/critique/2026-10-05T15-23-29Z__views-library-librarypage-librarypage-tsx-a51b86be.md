---
target: the library (home) screen
total_score: 31
max_score: 40
na_heuristics:
p0_count: 0
p1_count: 2
target_identity: 'file:/mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/library/LibraryPage/LibraryPage.tsx'
target_fingerprint: 'sha256:d671ae28118549f8508e47d56f404ab57b78dc8e2f401e0f73f0b0423310facb'
target_path: /mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/library/LibraryPage/LibraryPage.tsx
timestamp: 2026-10-05T15-23-29Z
slug: views-library-librarypage-librarypage-tsx-a51b86be
---

Method: dual-agent (A: ses_ef35dcdecffeTtYIxxXAGPf7Iu · B: ses_ef35dcdecffdIdw7HDLHV4qhGE)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1         | Visibility of System Status     | 3         | Sync state is strong, but shuffle reports pressed on every row, not the one playing                                      |
| 2         | Match System / Real World       | 4         | Plain, honest language throughout ("Up to date", "Synced just now")                                                      |
| 3         | User Control and Freedom        | 4         | Undo window, Cancel/Dismiss, Escape, focus returns to the opener                                                         |
| 4         | Consistency and Standards       | 3         | `aria-pressed` toggle contract broken; two identical Add controls; the count composes differently from the detail screen |
| 5         | Error Prevention                | 3         | Client schema check is good; delete relies on a short undo with the row still live                                       |
| 6         | Recognition Rather Than Recall  | 3         | Lock-glyph meaning is hover-only; no "which playlist is playing" mark on web                                             |
| 7         | Flexibility and Efficiency      | 2         | No search/sort/filter/batch/reorder; the row is a div, so no open-in-new-tab                                             |
| 8         | Aesthetic and Minimalist Design | 4         | Calm, restrained, well-spaced; no ornament that is not a fact                                                            |
| 9         | Error Recovery                  | 2         | The failed read is a bare sentence with no retry; a failed sync gives red with no reassurance                            |
| 10        | Help and Documentation          | 3         | The empty gallery and the dialog carry the sync model; little else needed                                                |
| **Total** |                                 | **31/40** | **Good**                                                                                                                 |

## Design Specificity Verdict

**LLM assessment**: Partially grounded. The metadata is PlayLiberty's, and it is sync-shaped rather than catalog-shaped: "Up to date · Synced just now", track counts, the private-lock glyph, the deferred delete with a single undo window. The composition is not: a 32px title top-left, a filled accent button top-right, then rows of square artwork, a 24px semibold name, a muted meta line, and two ghost icon buttons. Blur the strings and the same layout serves a podcast app, a document library, or an admin table. The one fact that makes the product different (your copy survives takedown) lives only in the empty screen's body copy, never in the visual or interaction language. The "gallery" the design record names does not read as a personal, curated collection.

**Deterministic scan**: `impeccable detect` on `apps/web/src/views/library` is clean (exit 0, `[]`). Widening to the shared components the screen renders surfaces exactly one finding: `layout-transition` ("Layout property animation", severity warning) at `apps/web/src/shared/player/PlayerBar/PlayerBar.module.scss:273`, snippet `transition: width`, on `&__fill`, the scrub progress fill, imported by `PlayerBar.tsx`. The library route at rest does not show it: `PlayerBar` returns `null` when nothing is playing, so the rule is in the loaded module graph but not on screen. The finding is genuine and belongs to the persistent player, not the library list.

**Visual overlays**: Overlay injection succeeded. Assessment B opened a fresh tab at `http://127.0.0.1:5273/`, confirmed mutable injection (set `document.title`, appended an executing `<script>`), started `live-server` on port 8400, injected `detect.js`, and read the console: `[impeccable] 1 anti-pattern found` then `layout-transition | transition: width | [node HTMLBodyElement]`. The live server was stopped after the read, so no overlay is left on screen; the console output is the evidence. The node attribution (`HTMLBodyElement`) is a false positive: `document.body` computes `transitionProperty: all` with `transitionDuration: 0s`, and zero elements in the DOM have a computed `transitionProperty` containing `width`. The rule is loaded but its owning element is unmounted.

## Overall Impression

A calm, well-built, honest list screen, stronger on state and restraint than on identity. The sync-state machinery, the empty-gallery copy, and the deferred delete are genuinely considered. The biggest opportunity is the shuffle control: it is the one interaction that lies (a global pressed state painted on every row), and it is also the row's most prominent control after the name. Fix that and the failed-read dead end, and the screen is solid. The larger question is whether the composition should look less like every media list.

## What's Working

1. **State is never carried by colour alone, and the two signals cannot drift.** The sync word and the cover's hairline read from the same `data-state` element via `:has()`, so a failed playlist shows "Sync failed" _and_ a red edge, a syncing one amber, a resting one neutral. It survives greyscale and low vision.
2. **The empty gallery copy earns its place.** It states the product's reason to exist at the only moment saying it is not nagging, and it is worded differently from the playlist empty state on purpose.
3. **The deferred-delete pattern is considered.** One page-owned undo window that replaces rather than stacks, a live region that announces the displaced intent, and a sweep ring instead of a countdown number.

## Priority Issues

**[P1] Shuffle reports pressed on every row, not the one it belongs to.**

- **What**: `PlaylistListItem` passes the global `usePlayerStore(state => state.shuffle)` into every `PlaylistHeader`, so when any queue is shuffled all rows get `aria-pressed="true"` and the accent fill. Confirmed live: pressing Shuffle on "Focus" turned all three rows green and all three toggles pressed.
- **Why it matters**: it is a false status, visually and to assistive tech. A screen-reader user hears three pressed toggles and cannot tell which playlist is playing, and it erodes the accent, which elsewhere means "this is the live thing".
- **Fix**: derive pressed from whether the queue's playlist id equals this row's id _and_ shuffle is on, leaving other rows unpressed. Or make the control a plain action button ("Start this playlist shuffled") with no `aria-pressed` at all, which matches what the record says the press does.
- **Suggested command**: $impeccable polish

**[P1] The failed-read state has no recovery.**

- **What**: `LibraryPage` renders `<p role="alert">Playlists could not be loaded.</p>` and nothing else: no retry, no detail, no distinction between a network blip and an empty library.
- **Why it matters**: this is the one state where the whole product is unreachable, and the user is given a dead end at the exact moment they need a door.
- **Fix**: add a "Try again" control wired to refetch, and surface the server's `detail` when it is an `ApiError`, so a recoverable fault is distinguishable from a broken instance.
- **Suggested command**: $impeccable harden

**[P2] A sync failure on the library omits the reassurance the product is built on.**

- **What**: the library shows only the red word and hairline for a failed playlist. The "your tracks are safe / nothing was lost" sentence is owned by the sync-error component on the detail screen.
- **Why it matters**: the library is where a household scans its whole collection. The core promise is that a failed sync never costs a track; that is exactly the fact a user needs at a glance here, and it is the one fact withheld. Red with no explanation reads as data loss.
- **Fix**: give the row's sync line a short reassurance in the `error` state, and make "Sync now" more discoverable than a buried overflow item.
- **Suggested command**: $impeccable clarify

**[P2] The delete toast contradicts the unchanged row.**

- **What**: on delete, the toast says "Deleting playlist X" while the row stays fully rendered and interactive for the whole undo window; it then disappears with no confirmation.
- **Why it matters**: the user sees a claim the screen denies, and can open or rename a playlist that is about to vanish. Miss the window and the loss is silent.
- **Fix**: mark the row as pending for the window (dim it, `aria-busy`, disable its controls), or remove it optimistically and restore it on cancel.
- **Suggested command**: $impeccable polish

**[P2] Playlist covers depend on `i.ytimg.com`, and a dead cover is unhandled.**

- **What**: covers render `https://i.ytimg.com/vi/<id>/hq.jpg`. When `coverUrl` is null the sleeve draws, but when the URL exists and 404s (exactly the removed-video case the product is built around) the `<img>` fails and leaves an empty box, because the sleeve fallback is gated on `coverUrl === null`, not on load failure.
- **Why it matters**: the promise is "a removed video never removes a track". The audio survives, but the cover does not, and the browser also makes a third-party call to Google from a private instance, contradicting the private-instance and stored-media principles.
- **Fix**: treat image load failure as no-art (`onError` toggles to the sleeve), and consider storing the cover beside the audio like the track thumbnail.
- **Suggested command**: $impeccable harden

## Persona Red Flags

**Sam (accessibility)**: the shuffle `aria-pressed` lie (three pressed toggles, no way to tell which playlist is live); the share/lock indicator's visual tooltip is hover-only and not Escape-dismissible (WCAG 1.4.13 unmet), so a sighted keyboard user cannot decode it; the row door is a div, so the only keyboard path into a playlist is the name link.

**Alex (power user)**: no search, sort, filter, or pagination, and the documented 50-playlist cap means 50 doors with no way to narrow; no batch actions; the row is a div, so middle-click or Cmd-click cannot open a playlist in a new tab; every row carries an ambiguous shuffle toggle, which for a 40-playlist library is 40 noisy controls.

**Casey (distracted mobile)**: on a phone browser the 32px title and the full labelled Add button eat the top, because the FAB and sheet are the _mobile client's_ idioms and the web client never draws them; the lock glyph is undecodable on touch; three green shuffle buttons suggest three things are playing; the undo toast is anchored bottom-left, far from a right thumb, with a short window.

## Minor Observations

- The count sits on its own third line under the sync line; on the playlist detail it shares the sync line, so the same component composes differently across consumers.
- Two "Add a playlist" controls on the empty screen; the header control could be suppressed there without loss.
- The skeleton cover uses `--surface` while the real cover uses `--surface-raised`, a small tonal step on swap.
- The overflow panel opens downward and overlaps the next row (documented and accepted).
- After Add, the new playlist appears behind the still-open dialog for a beat.
- The empty gallery is top-aligned, leaving a large void on a tall desktop.
- The Add button label is "Add" while the entry point is "Add a playlist".
- The state dot is drawn on every row including resting ones, so it adds a mark to "Up to date" that says nothing.
- Deterministic: the `transition: width` scrub fill in `PlayerBar.module.scss:273` forces layout each frame when the bar is mounted; animating `transform: scaleX()` would avoid it.

## Questions to Consider

1. If durable sync is the reason the product exists, why is sync the smallest, muted-est line while 96px of artwork and a 24px name dominate? What would the item look like if sync were the headline rather than the footnote?
2. The records call this a gallery. Does the composition read as a personal, curated collection, or as any media list? What single move would make it unmistakably PlayLiberty?
3. Web deliberately draws no pause glyph and no strip, so nothing marks which playlist is playing. On a 40-item gallery, is "no mark at all" the right cost when a pause glyph is cheap?
4. When the source video dies, the audio survives by design, but the cover does not. Should the cover be as durable as the track it represents?
5. Two identical "Add a playlist" buttons on the empty screen: which one is the invitation? Would suppressing the header's on the empty state be more honest than duplicating it?
6. Should shuffle on a row be a play action with a visible word, rather than a toggle whose meaning must be learned and whose state is global?
