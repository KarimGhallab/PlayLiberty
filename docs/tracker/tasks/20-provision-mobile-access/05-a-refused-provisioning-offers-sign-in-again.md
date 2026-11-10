# 05: A refused provisioning offers Sign in again

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "A failure closes the browser
and returns to the app with one sentence".

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

**Constraints:** The failure state reuses the signed-out screen, so the 44pt target and the disabled state have one owner.

See [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md).
