# 09: Status changes announce on iOS

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The app announces status changes with `accessibilityLiveRegion` in twenty places. That prop is Android-only. The
repository never calls `AccessibilityInfo.announceForAccessibility`, so on iOS a notice, a refusal and a sync result
are silent to VoiceOver.

Android is the stated runtime, so this is not a shipped-target failure today. It is a failure the moment the declared
iOS support is used.

## Expected

One helper owns the announcement: it calls the iOS announcement API and leaves the existing live region in place on
Android. A change is announced once on each platform, never twice.

## Evidence

- Twenty `accessibilityLiveRegion` sites across `apps/mobile/src`.
- No `announceForAccessibility` call anywhere in `apps/mobile`.

## Acceptance criteria

- [ ] One announcement helper exists, and every notice, refusal and sync result goes through it.
- [ ] On iOS the helper calls `AccessibilityInfo.announceForAccessibility` with the same sentence the user sees.
- [ ] On Android the live region still announces, and the helper does not announce a second time.
- [ ] A test mocks the platform and asserts one announcement per change on each platform.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The announcement test covers both platform branches.
