# 09: Status changes announce on iOS

**Status:** resolved
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

- [x] One announcement helper exists, and every notice, refusal and sync result goes through it.
- [x] On iOS the helper calls `AccessibilityInfo.announceForAccessibility` with the same sentence the user sees.
- [x] On Android the live region still announces, and the helper does not announce a second time.
- [x] A test mocks the platform and asserts one announcement per change on each platform.

## Outcome

`shared/a11y/useAnnouncement` is the one helper. It returns `polite` on Android so the existing live region keeps
announcing, and returns `undefined` on iOS while calling `AccessibilityInfo.announceForAccessibility` with the visible
sentence. Every one of the twenty former live-region sites now goes through it: the notices, the sheet refusals, the
sync and egress status, the skeletons, the snackbar and the sign-in states.

`Notice` and `UndoSnackbar` announce the sentence together with the detail line, matching what is on screen. The helper
does not speak an empty or absent message, and it does not repeat an unchanged one.

The new suite replaces the platform, asserts one call per change on iOS, asserts no call and a `polite` region on
Android, and asserts silence for a null message.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The announcement test covers both platform branches.
