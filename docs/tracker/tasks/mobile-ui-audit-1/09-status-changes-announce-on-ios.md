# 09: Status changes announce on iOS

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

`shared/a11y/useAnnouncement` is the one helper. It returns `polite` on Android so the existing live region keeps
announcing, and returns `undefined` on iOS while calling `AccessibilityInfo.announceForAccessibility` with the visible
sentence. Every one of the twenty former live-region sites now goes through it: the notices, the sheet refusals, the
sync and egress status, the skeletons, the snackbar and the sign-in states.

`Notice` and `UndoSnackbar` announce the sentence together with the detail line, matching what is on screen. The helper
does not speak an empty or absent message, and it does not repeat an unchanged one.

The new suite replaces the platform, asserts one call per change on iOS, asserts no call and a `polite` region on
Android, and asserts silence for a null message.
