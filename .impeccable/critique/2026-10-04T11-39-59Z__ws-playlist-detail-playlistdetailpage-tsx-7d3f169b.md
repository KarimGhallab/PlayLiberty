---
target: the playlist detail page
total_score: 22
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 2
target_identity: 'file:/mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/playlist-detail/PlaylistDetailPage.tsx'
target_fingerprint: 'sha256:314b75f11e6dd127e5afaa9173c607fce0e471c269c2e31970f0e902b47ed3a6'
target_path: /mnt/Fichier/Documents/Projets/PlayLiberty/apps/web/src/views/playlist-detail/PlaylistDetailPage.tsx
timestamp: 2026-10-04T11-39-59Z
slug: ws-playlist-detail-playlistdetailpage-tsx-7d3f169b
---

Method: dual-agent (A: general/design-review · B: general/detector-evidence)

## Design Health Score

| #         | Heuristic                       | Score     | Key Issue                                                                                                                       |
| --------- | ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of System Status     | 2         | Deferred delete announces "Deleted playlist" before commit; in-flight summary leaks "counted from the tracks this client holds" |
| 2         | Match System / Real World       | 2         | Retained track reads "Removed from YouTube"; raw server failure string rendered as row copy                                     |
| 3         | User Control and Freedom        | 3         | Real undo window, but the pending delete is only cancellable from a low-salience toast                                          |
| 4         | Consistency and Standards       | 3         | Name is a self-link here and a real link in the library; row menu opens up, header menu opens down                              |
| 5         | Error Prevention                | 2         | Delete is deferred, not confirmed; a second delete silently replaces the first                                                  |
| 6         | Recognition Rather Than Recall  | 2         | Row state carried by shape + tone; no positive mark for a retained track                                                        |
| 7         | Flexibility and Efficiency      | 3         | Keyboard play/seek/shuffle; no bulk retry, no reorder, no "show problems" filter                                                |
| 8         | Aesthetic and Minimalist Design | 3         | Calm and restrained; undercut by raw diagnostics in rows and a large dead zone below a short list                               |
| 9         | Error Recovery                  | 2         | SyncError is excellent; the not-found route is a generic dead end with no cause or action                                       |
| 10        | Help and Documentation          | n/a       | Private household tool; the empty state's inline explanation is the right substitute                                            |
| **Total** |                                 | **22/36** | **Acceptable (61%)**                                                                                                            |

## Design Specificity Verdict

**Partially grounded, and it loses the product in the one place that matters most.**

Genuinely this product: the sync summary's four-cell kept/added/removed/failed band with its muted-zero rule is a reconciliation surface no generic player carries; the sync error's "a sync never deletes" reassurance is product voice; the share indicator (`Private playlist` / lock-with-arrow / person) encodes a household model; the `Removed` / `Unavailable` tone split is deliberate. These are authored.

Category-interchangeable: the track list itself. Thumbnail, title, duration, overflow, no column naming source, retention, or sync lineage. For an app whose entire reason to exist is "a removed video never removes your track," the row says the least about that fact of anything on screen. The promise is stated once, in the empty state, then never carried into the list where the user lives.

**What the deterministic scan found:** one finding, `layout-transition` (`transition: width`), at `apps/web/src/shared/player/PlayerBar.module.scss:270`. It is a true positive by the rule and a pre-existing, design-record-owned warning: it appears verbatim in `docs/design/components/player-bar.html:198` and its screen mirrors. It is not introduced by this page and not this page's to fix. The markup-only scan of the detail's `.tsx` files is otherwise clean. No rule-based defect the LLM review missed, and no false positive beyond its body-level overlay attribution.

**Visual overlays:** injection succeeded in a fresh `[Human]` tab (`detect.js` loaded, network 200, `onload` true). The console reported exactly one anti-pattern, matching the CLI. The overlay attributed it to `[node HTMLBodyElement]`, so it does not localize the element; the CLI file/line is the precise location.

## Overall Impression

A calm, disciplined, unusually self-consistent screen whose happy path is excellent and whose edge states (not-found, failed row, retained-track word) are substantially weaker. The single biggest opportunity: carry the retention promise into the track list, where the product actually proves itself.

## What's Working

1. **The sync-error component is exemplary.** Mapped human copy, a reassurance that adapts to the track count, one recovery action, and the unbounded server diagnostic collapsed behind "Show details." The correct pattern, applied to this product's specific failure.
2. **The muted-zero rule in the sync summary.** Colour is spent only on a count that is not zero. Turns a reconciliation table into a scannable line, and it is product-specific.
3. **The two-arrangement header is a real decision, not a CSS branch.** The record's arithmetic (card 470.4px vs row 136px at 390) is honoured exactly in the live DOM; the name's honest truncation while playing is the consequence, not a bug.

## Priority Issues

**[P1] The retained-track row says "Removed from YouTube," inverting the product promise.**
Where: `packages/ui-foundation/src/formatters.ts:157-164`. The doc comment directly above the function states the contract is `Removed, still here`, and the design record's specimen list renders `Removed, still here` (playlist-detail.md:180). The code returns `Removed from ${providerLabel(provider)}` for any removed source, so `stored/removed` (retained and playable, the whole point) and `unavailable/removed` (terminal) share a word and differ only by tone.
Why it matters: the brand commitment is "the user never has to notice a removal." The UI makes them notice, and frames a win as loss. This is the highest-leverage copy fix in the product.
Fix: return `Removed, still here` for `stored/removed`; give `unavailable/removed` its own word ("Unavailable"). Keep the retained title at full ink (the record already argues against dimming).
Suggested command: `$impeccable clarify`

**[P1] The failed row renders the raw server diagnostic as primary copy.**
Where: `TrackRow.tsx:216-220` renders `track.failureReason` inline in `.sub`; live it read "Failed The E2E fake was told to fail this download." `failureReason` is documented as "a non-null string with no length bound," inside a `flex-wrap: nowrap` sub-line.
Why it matters: in production this ranges from cryptic (`HTTP 403`) to misleading, and a long string overflows toward the duration column. The design's own answer (`SyncError`) was to collapse unbounded diagnostics; the row does the opposite. A screen reader reads the raw string verbatim.
Fix: show the mapped word ("Failed") in the row; move the raw reason behind the row's overflow menu or cap it to one ellipsized line. Never render the server string as row copy.
Suggested command: `$impeccable clarify`

**[P2] The not-found state is a generic dead end.**
Where: `PlaylistDetailPage.tsx:285-289` renders "Tracks could not be loaded." for any `tracks.isError`; there is no `playlist.isError` branch. The design record (playlist-detail.md:306) and `DESIGN.md:87` both list the not-found state as an unbuilt component that "needs one."
Why it matters: this is the screen the product exists for; its failure reads as a bug and names the wrong thing. It does not distinguish "does not exist" from "you cannot see it" (a revoked share is a normal household event), and offers no action.
Fix: build the not-found composition the record calls for: a heading that names the situation ("This playlist is not here"), copy that holds both causes without claiming to know which, and a primary "Back to playlists" action.
Suggested command: `$impeccable harden`

**[P2] The deferred delete is low-salience, past-tense, and re-armable.**
Where: `PlaylistDetailPage.tsx:159-170` + `UndoToast` (message "Deleted playlist"). The page stays fully interactive for 6s; a screen reader announces "Deleted playlist" via `role="status"` while nothing has been deleted; a second delete silently replaces the first pending one.
Why it matters: the user's mental model is "it's gone," but it is not, and the only way to stop it is a small toast far from the act.
Fix: use pending language ("Deleting playlist… / Cancel") and anchor the pending state to the card. Consider a confirm step for delete specifically, keeping undo for track removal.
Suggested command: `$impeccable clarify`

**[P2] No heading structure; the playlist name is a self-link.**
Where: `PlaylistHeader.tsx:390-396` renders the name as a `<Link>` to the current route; the page has no `<h1>`, and `EmptyState.tsx:36` ships an orphan `<h2>`.
Why it matters: screen-reader heading navigation is empty on the primary screen, and a control that goes nowhere is the exact fault the design system says it avoids. On touch the name is inside the card and easy to mis-tap.
Fix: render the name as an `<h1>` on the detail route; keep the `<Link>` only in the library arrangement.
Suggested command: `$impeccable audit`

## Persona Red Flags

**Alex (Power User)**
No bulk retry for failed tracks: with failures scattered down a long list, each must be opened individually. No reorder and no "play next"; the header play always rebuilds from track 1. No "show only problems" filter, so recovering a partial sync is O(n) scanning. The header overflow opens down over the cover while the row overflow opens up: two directions for one gesture.

**Sam (Accessibility-Dependent)**
Zero headings: no `<h1>`, and the never-synced state adds an `<h2>` with no parent. The `<nav>` is unnamed and holds one link. The retained-track state is carried by a word that is wrong (`Removed from YouTube`) plus a tone shared with dead rows, so the difference between "playable forever" and "gone" is not announced. The raw failure string is read out verbatim. The deferred delete announces "Deleted playlist" to a live region while nothing has been deleted. Automated accessibility passes at 100 on the happy path, which is exactly why these structural and state gaps survive.

**Casey (Distracted Mobile)**
Touch targets below 44px: header shuffle and overflow are 32×32, the track-row action lane is 28×28 (only the header transport reaches 44 via a `::before`). The header transport's "Track next" right edge lands at the frame edge (the record's own "5.2px off the screen"), and the flush player bar measured 397px on a 390px viewport in the playing state, clipping the volume control. The name truncates to "Eveni…" while playing, so it becomes unreadable exactly when playback starts. No long-press affordance on rows; the only route to remove is the 28px lane.

## Minor Observations

- `SyncSummary` in-flight line "counted from the tracks this client holds" is implementation language surfaced to users.
- The failed row's server string is the leap the design's progressive disclosure otherwise avoids.
- Desktop: at 900px with a short list, roughly 700px of the right column is empty; the composition is top-anchored with a large dead zone. Inherent to a short playlist but worth a deliberate answer.
- The empty-state "Sync now" and the sync-error "Sync now" are different components for the same verb.
- `data-arrangement` / `data-state` styling hooks are consistent with the design's stated approach.
- The way-home link is a good size on desktop (135×35) and correctly absent on mobile.
- The card's transport swap preserves card height in every state, as designed.

## Questions to Consider

1. The product's thesis is "a removed video never removes your track." Why is that sentence only in the empty state, and never in the list where it happens? Should a retained track carry a positive mark rather than only a bad-news word?
2. Is the track list a music list or a reconciliation surface? The count of kept tracks, the thing the server fought to preserve, is nowhere in the list.
3. What is the playlist name link for on this route? It points at the page you are on.
4. Progressive disclosure collapses raw text in the sync error and defers the destructive acts, but the failed row shows raw text. Why does it stop at the list boundary?

## Run Notes

- Target slug: `ws-playlist-detail-playlistdetailpage-tsx-7d3f169b`.
- Ignore list: none (`.impeccable/critique/ignore.md` absent).
- Assessment independence: dual-agent, parallel, isolated. Neither sub-agent saw the other's output; Assessment B was instructed not to judge.
- CLI detector: clean on markup-only `.tsx`; one `layout-transition` warning at `PlayerBar.module.scss:270`, pre-existing and design-record-owned.
- Browser visibility: 1280x900 and 390x844 (emulated; `resize_page` clamps to ~500px).
- Overlay injection: succeeded in a fresh `[Human]` tab; one finding reported, matching the CLI.
- Live-server cleanup: stopped; both sub-agents' stacks stopped by PID, no `pkill`.
- Temp-file cleanup: body file deleted after the snapshot write.
- False positives corrected in synthesis: Assessment A's "player bar keeps asserting a 404 playlist" is wrong: `PlayerBar` mounts in `router.tsx`, not the detail page, and does not gate on this route's query.
