# 05: A refused provisioning offers Sign in again

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "A failure closes the browser
and returns to the app with one sentence", and user stories 24 and 26.
**Blocked by:** None. Can start immediately.

## Outcome

The callback's failure state now draws the signed-out screen with the localized problem sentence and one action
labelled "Sign in again" in English and "Se connecter à nouveau" in French. The action starts a new provisioning flow,
is disabled while it starts, and shows the busy label. The sentence stays visible until the new flow replaces the
screen.

A state mismatch, a callback with no flow in progress, and a callback with no code or state each show the generic
sentence and the same action. The success path still writes the token and returns to the library.

The browser start and the failure mapping moved to shared helpers used by the library route and the callback, so the
two entry points cannot drift. The signed-out action accepts an optional label, and the callback module moved into
its own folder with its test.

## Verification

- Mobile 69 tests across 15 suites, `tsc --noEmit`, i18n 42 tests, `pnpm run build` and `pnpm run lint:check` pass.
- Six callback tests cover the refusal sentence and action, the pending disabled state, the state mismatch, the
  missing flow, the missing code or state, the French label, and the success path.

## Notes

- The failure state reuses the signed-out screen rather than drawing a second action surface, so the 44pt target and
  the disabled state have one owner.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
