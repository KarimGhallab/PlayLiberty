# 123: A second design critique scores the mobile app 26/40

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. The tickets are in [`mobile-ui-critique-2`](../tasks/mobile-ui-critique-2/TICKETS.md).

## Agent Brief

**Category:** bug
**Summary:** The second design critique, run on 2026-11-05 against the live emulator, scores the mobile client 26/40. The
score is unchanged from three days earlier while the composition moved: four P1 gaps were closed, and the retention view
that closed one of them names survival with the word that names loss. Dynamic Type breaks the player bar at 2.0, the
gallery stays in the accessibility tree behind the playlist sheet, and the status rail hides its own selection.

**Current behavior:**
The library and the detail both draw a "Removed from YouTube" state under a track whose source was removed, whether the
file survived or never arrived. The retained chip added on 2026-11-03 reuses that string, so the view that proves
retention reads identically to the view that lists losses. A playlist whose missing tracks are terminal still carries a
download marker, and the failure band reassures with the association count rather than the stored count.

At `font_scale 2.0` the player bar's title overlaps its meta line and its seek times collide, and the brand renders at
40pt inside a 24dp line box.

The playlist detail is a transparent modal; the gallery below stays focusable for a screen reader, and one dump holds 56
clickable nodes across both screens.

The gallery's status rail never reveals its default selection, so the selected chip is cut at 1.0 and the whole rail is
off-screen at 2.0. The detail's compact header slices a row at its edge and drops the owner line at 2.0. Track titles
are one line below 1.3. The floating add covers the lane of the row beneath it. Reduced motion still translates the bar's
deck and the sheet panel under the finger.

**Desired behavior:**
A row states the file fact and the source fact separately, each with one word, so a kept track never reads like a lost
one. Counts report what is actionable separately from what is terminal, and the reassurance counts stored tracks. Every
text control holds at 2.0 or caps its multiplier where the layout is fixed. The gallery is hidden from assistive
technology while the landscape sheet covers it. The selected chip is visible at rest on both rails, and the compact
header ends on a boundary and keeps the owner. No gesture translates a panel under reduced motion.

**Key interfaces:**

- `packages/i18n`: the track-state keys, `removedFrom`, `retainedChip`, `trackStateFacts`, and both catalogs.
- `packages/ui-foundation`: `fileTone`, `trackTone` and the retained tone.
- `docs/DESIGN.md`, "Track states": the rule this issue changes, and its replacement.
- `apps/mobile/src/views/playlist/PlaylistIdentity` and `GalleryFilterBar`: the two rails and the header's fixed height.
- `apps/mobile/src/player/PlayerBar` and `SeekBar`: the bar's line heights, its cap and its accessible names.
- `apps/mobile/app/_layout.tsx`: the detail route's transparent-modal presentation.

**Acceptance criteria:**

- [ ] Every ticket in `mobile-ui-critique-2` resolves.
- [ ] The critique's four P1s are closed on the device, not only in tests.
- [ ] A later critique can score the retention view without the word collision.

**Out of scope:**

- A search field on the library, which `docs/PRODUCT.md` lists as a permanent non-goal.
- Redesigning the gallery, the dial, the bar or the sheets.

## Observed

- A kept track and a lost track share one state sentence, and the retained chip uses the same words.
- A terminal availability count is drawn as a download in progress, and the failure reassurance counts associations.
- The player bar collides at 200% text.
- The gallery remains focusable behind the playlist sheet.
- The status rail never reveals its default selection.

## Expected

- The row reports two facts with one word each, and the retained view names survival.
- Counts separate actionable work from terminal absence, and the reassurance is arithmetically true.
- Every text control is readable at 2.0.
- The screen under a modal is hidden from assistive technology.
- The selected chip is whole at rest.

## Evidence

The critique snapshot is `.impeccable/critique/2026-11-05T21-19-47Z__apps-mobile.md`. The live evidence is 34 screenshots
and hierarchy dumps under `/tmp/opencode/critique-mobile2/`, captured on `emulator-5554` (1080x2400 at 420 dpi) against
the signed-in app with 11 playlists and 1275 tracks.

The detector returns an empty array for this client by construction; a paired control in the same run shows the same
values producing four findings as HTML and CSS and none as a React Native `StyleSheet`. The scan is not evidence here.
