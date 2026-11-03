# 04: Pushed screens have a back control

**Status:** resolved
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

## Outcome

The detail's back control sits over the cover's top-left, a 44pt `surface-raised` circle with the chevron and the
shared "Back" word. It is drawn above the two action layers, because the first cut left it under the wide layer and
the emulator tap did nothing; the control now leaves through the same `leaveDetail` the pull uses. The egress
console's back is the first control in the `Screen` title row, and the gate's two loading screens carry the same
control. `common.back` is in both catalogs.

The egress gate owns the navigation: it goes back when the stack can, and replaces to the library when the console was
opened directly. The iOS edge swipe stays disabled because the detail is a sheet with its own pull; the control is the
documented path, as the ticket allows.

The Maestro `detail-play` flow now leaves by tapping `detail-back` instead of the hardware back. The Screen, egress and
detail suites pass, and the emulator returned from the detail to the gallery through the control.

## Verification

`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check`
and `pnpm run build` pass. The Maestro `detail-play` flow reaches the detail and returns through the control, and the
egress flow does the same.
