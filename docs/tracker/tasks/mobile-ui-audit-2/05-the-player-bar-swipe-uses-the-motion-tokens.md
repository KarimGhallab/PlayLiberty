# 05: The player bar swipe uses the motion tokens

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The swipe's completion uses `duration: 260` and `Easing.bezier(0.4, 0, 0.2, 1)`. `docs/DESIGN.md` says three
durations and exactly one curve; this is the one animated control outside the set.

## Expected

The swipe uses `tokenDuration('motion-slow')` and `standardEasingBezier`. The gesture still follows the finger and
completes at the same threshold.

## Evidence

- `apps/mobile/src/player/PlayerBar/PlayerBar.tsx`: the 260ms timing and the custom bezier.

## Acceptance criteria

- [x] The swipe uses one of the three durations and the one curve.
- [x] No 260ms literal or custom bezier remains in the player bar.
- [x] The swipe threshold, the neighbour preview and the spring settle are unchanged.
- [x] A test asserts the token values or the absence of the literals.

## Outcome

The swipe's completion reads `swipeMotion`, which takes `tokenDuration('motion-slow')` and the shared
`standardEasingBezier`. The 260ms literal and the custom bezier are gone; the 26% threshold, the neighbour preview and
the spring settle are untouched. A unit test pins both values, and the emulator swipe moved the queue from 1/67 to
2/67.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck` and
`pnpm run lint:check` pass. The emulator swipe still completes the skip.
