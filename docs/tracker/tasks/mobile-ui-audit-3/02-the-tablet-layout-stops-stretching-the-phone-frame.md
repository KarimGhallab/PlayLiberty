# 02: The tablet layout stops stretching the phone frame

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [Five gaps remain in the mobile UI](../../issues/107-five-gaps-remain-in-the-mobile-ui.md)
**Blocked by:** None. Can start immediately.

## Observed

At 800dp the detail's Play sits at the left edge and Shuffle and the actions door at the right edge, about 500dp apart,
with a wide dead area between them. The identity column and the track rows run the full width. The gallery adapts to
three columns; the header, detail and rows do not.

## Expected

The chrome and the rows sit in a bounded content column, or the detail becomes two panes, so related controls stay near
each other and a row stays scannable. The gallery keeps its three columns.

## Evidence

- The emulator at 1600x2560 / 320 dpi (800dp): the gallery's three columns, and the detail's action row spanning the
  width.
- `apps/mobile/src/shared/components/Screen/Screen.tsx`: the content has padding but no maximum width.
- `apps/mobile/src/shared/components/LibraryHeader/LibraryHeader.tsx`: the brand and the doors are `space-between`.
- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: the controls are positioned from
  `window.width`.

## Acceptance criteria

- [x] At 800dp the header, the detail's action row and the track rows share one bounded column, or the detail uses two
      panes.
- [x] The gallery keeps its three columns, and the phone layout at 411dp is unchanged.
- [x] `docs/DESIGN.md` records the chosen arrangement.
- [x] A test pins the width rule.

## Outcome

The content column is capped at 720 and centred. The `Screen` frame, the detail's list and its pending and error
states, the identity header and its skeleton all read the same column, so the chrome and the rows share one measure.
The gallery's column math reads the capped width, so its three columns still fill the content box. The player bar
stays full-bleed as the persistent overlay.

At 800dp the gallery and the detail sit in a centred 720 column; the detail's header backdrop stays full-bleed. At
411dp nothing moves. `docs/DESIGN.md` records the cap. The column rule has its own test, and the gallery test asserts
the capped box.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator at 800dp shows the bounded column or the two panes.
