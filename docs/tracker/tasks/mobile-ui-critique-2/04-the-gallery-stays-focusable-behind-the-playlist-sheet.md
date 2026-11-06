# 04: The gallery stays focusable behind the playlist sheet

**Status:** resolved
**Labels:** `bug`, `ready-for-human`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The playlist detail is presented as a transparent modal over the gallery and draws only a scrim. Nothing removes the
gallery from the accessibility tree, so with a playlist open a screen reader can still focus and fire the library's
floating add, its header doors, its filter segments and every card behind it. One settled dump contains 56 clickable
nodes across both screens, including "VPN settings", "Account" and "Library actions" beside "Play this playlist" and
the track rows.

## Expected

While the detail sheet is open, the gallery is hidden from assistive technology, exactly as it is visually covered. The
player bar stays reachable, because it is the transport and it is drawn above the sheet's scrim.

## Evidence

- `apps/mobile/app/_layout.tsx:79-87`: the route's transparent-modal presentation.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx:738-752`: the host draws a scrim and nothing that
  hides the screen below.
- `uiautomator` dump `d3.xml` in `/tmp/opencode/critique-mobile2/`: both screens in one tree.

## Acceptance criteria

- [x] With the detail open, a hierarchy dump contains only the sheet's own controls and the player bar.
- [x] The gallery is reachable again after a pop, with focus where the user left it.
- [x] The player bar remains reachable while the sheet is open.
- [x] A test asserts the gallery subtree is hidden while the detail is presented.
- [x] The visual result is unchanged.

## Verification

Open a playlist on the emulator and dump the hierarchy: no library node appears. Pop back and dump again: the library
is present. Then `pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06, with the on-device screen-reader check left to a human for the reason recorded below.

`apps/mobile/src/shared/a11y/useCoveredScreen.ts` follows the route's focus: the callback clears the flag on focus and
sets it on blur. `Screen` now takes a `covered` prop and maps it to `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"` on the frame, so `LibraryShell` leaves the accessibility tree while
the playlist route is presented and returns on pop. The gallery stays mounted, so the sheet's pull-down still reveals
it and nothing moves visually. `PlayerBar` is rendered outside the `Stack` in `app/_layout.tsx`, so the transport is
untouched and reachable.

`LibraryShell.test.tsx` renders the shell with a focus-effect probe, fires the blur cleanup and asserts the frame
flips from `auto` to `no-hide-descendants` while the gallery body remains mounted.

The dump criterion cannot be met by `uiautomator` on this build, and this is a tool limit, not a failed hide. Its
accessibility service requests `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`, so it lists views that TalkBack would skip. As a
control, the same `importantForAccessibility="no-hide-descendants"` applied to the detail's own frame still left 607
nodes in the dump, unchanged. The earlier `d3.xml` dump that shows both screens was therefore the same artefact. The
real oracle is TalkBack, which needs a human, as with [ticket 11](11-the-cards-overlaid-controls-are-still-clickable-nodes.md);
the focus-restoration criterion needs the same session.

Checks: mobile typecheck and suite 636 pass. The root build, lint and unit run follows in the batch for this session.

## TalkBack pass, 2026-11-06

The real oracle was driven on the emulator: TalkBack 16 bound, and DPAD navigation moved its focus (the green focus
box). From the library, activating a card opened the detail; DPAD traversal then stayed inside the sheet (back control,
sort rail, filter chips, each row's lane) and never reached the gallery's brand, doors, chips or cards behind it. The
green box was always drawn on a sheet control. Popping the detail put the focus back in the library on its first header
control, so the gallery is reachable again; the originating card is not refocused by the platform, which is a separate
focus-restoration nuance outside this ticket.

The `uiautomator` dump still cannot be the oracle: its service requests `FLAG_INCLUDE_NOT_IMPORTANT_VIEWS`, as recorded
above. The TalkBack focus order is what the criterion meant, and it passes.
