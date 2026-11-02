# 02: The player bar grows with large text

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The player bar is a fixed 92pt capsule with `overflow: hidden`. After padding and the 32pt seek row, the top row gets
48pt. At Android font scale 2.0 the title line is 38.4pt and the meta line 32.4pt, so the two lines need 70.8pt. Both
clip. The screens still reserve 98pt of bottom padding, so the bar does not grow and nothing compensates.

## Expected

At the largest Android font scale the track title and its playlist name are readable in full. If the bar cannot grow,
it drops the secondary line and caps the title, and the screens pay the height the bar actually has.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx`: `styles.capsule` height `playerBarHeight - 6`, `overflow: hidden`,
  `Title` and `Meta` with no `maxFontSizeMultiplier`.
- `apps/mobile/src/player/playerBarSize/playerBarSize.ts`: one fixed height used by both screens' bottom padding.

## Acceptance criteria

- [ ] At font scale 2.0 the bar's title and playlist name are not clipped, either because the bar's height follows its
      content or because the secondary line is dropped and the title is capped.
- [ ] The gallery and the detail reserve the bar's real height, including the bottom inset.
- [ ] A test renders the bar at font scale 2.0 and asserts no line is truncated.
- [ ] The seek row and the transport keep their 44pt targets at that scale.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro player journey passes with the emulator's font size at its largest setting.
