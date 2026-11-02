# 04: Pushed screens have a back control

**Status:** ready-for-agent
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The playlist detail is a `transparentModal` with `gestureEnabled: false` and no back control. On Android the hardware
back works, but nothing on screen says how to leave, and the pull-to-dismiss only starts on the header or at the top of
the list. On iOS the edge swipe is disabled, so there is no way back from mid-list at all. The egress console is a
pushed screen with a title and no back control either.

## Expected

Every pushed screen draws one back control, named for assistive tech, in the same place. The pull-to-dismiss and the
system back both keep working.

## Evidence

- `apps/mobile/app/_layout.tsx`: `presentation: 'transparentModal'`, `gestureEnabled: false`.
- `apps/mobile/src/views/playlist/PlaylistIdentity/PlaylistIdentity.tsx`: no back control.
- `apps/mobile/src/views/egress/EgressScreen/EgressScreen.tsx`: no back control.

## Acceptance criteria

- [ ] The detail and the egress console each draw one back control, labelled in both languages.
- [ ] The control is reachable by touch and found by TalkBack and VoiceOver by name.
- [ ] The detail's pull-to-dismiss still works, and the control calls the same leave path.
- [ ] The iOS edge swipe is restored, or the control is documented as the path where the sheet idiom rules it out.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-play` flow reaches the detail and returns through the control, and the
egress flow does the same.
