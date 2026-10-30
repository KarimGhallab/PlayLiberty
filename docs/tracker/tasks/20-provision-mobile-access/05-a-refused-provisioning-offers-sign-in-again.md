# 05: A refused provisioning offers Sign in again

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [`20-provision-mobile-access`](../../specs/20-provision-mobile-access.md), "A failure closes the browser
and returns to the app with one sentence", and user stories 24 and 26.
**Blocked by:** None. Can start immediately.

## Observed

The callback route draws the failure sentence and no action. A person whose exchange is refused has to press back to
reach the signed-out state, where the one Sign in action lives.

## Expected

The failure state draws the localized problem sentence and one action that starts a new provisioning flow, labelled
"Sign in again" in both languages. The sentence stays visible until the new flow starts, and the action is disabled
while it starts. A state mismatch and a callback with no flow in progress show the generic sentence and the same
action.

## Evidence

The callback renders the screen with the sentence and no child action.

## Acceptance criteria

- [ ] A refusal draws the localized problem sentence.
- [ ] The failure state offers one action that starts a new provisioning flow.
- [ ] The action's label is in both catalogues.
- [ ] The action is a 44pt target and is disabled while the flow starts.
- [ ] A state mismatch and a callback with no flow in progress draw the generic sentence and the same action.

## Verification

`pnpm --filter @playliberty/mobile run test`. The component test stubs the provisioning module and the browser,
renders a refusal, asserts the sentence, and asserts the action starts the flow. The i18n tests assert the new key in
both catalogues.
