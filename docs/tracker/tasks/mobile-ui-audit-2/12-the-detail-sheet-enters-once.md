# 12: The detail sheet enters once

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The route uses `animation: 'slide_from_bottom'` and the component animates `sheetY` from the window height, so the
entry can slide twice. The audit observed this in code and did not device-verify it.

## Expected

One entry motion. The pull-to-dismiss still follows the finger with the scrim, and reduced motion cuts.

## Evidence

- `apps/mobile/app/_layout.tsx`: the detail route's `slide_from_bottom`.
- `apps/mobile/src/views/playlist/PlaylistDetail/PlaylistDetail.tsx`: `sheetY` starts at `window.height` and the
  entry timing runs on mount.

## Acceptance criteria

- [x] The entry is one slide, confirmed on the emulator.
- [x] The pull-to-dismiss and its scrim are unchanged.
- [x] Reduced motion cuts instead of sliding.
- [x] The chosen owner is recorded in the ticket.

## Outcome

The route owns the entry and the exit. The detail screen slides in on the stack's `slide_from_bottom`, and the
component no longer starts `sheetY` at the window height or runs its own entry timing. The pull still moves `sheetY`
and lifts the scrim; a shorter pull springs back and a longer one pops the route. Reduced motion sets the route
animation to `none`, so the entry and the exit cut.

A screen recording of opening a playlist shows one continuous slide of the sheet and its scrim. The sheet's own offset
is 0 at rest and only the drag moves it.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass. The emulator
records the entry; the ticket names whether the route or `sheetY` owns it.
