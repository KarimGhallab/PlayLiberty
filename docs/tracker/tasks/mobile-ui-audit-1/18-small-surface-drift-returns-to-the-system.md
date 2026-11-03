# 18: Small surface drift returns to the system

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

Four small departures from the design system:

- The signed-out action draws a `↗` glyph as an icon while every other icon comes from Tabler.
- `NotFound`'s back label sets no family, so one string draws in the platform face.
- The run band's failure callout and the signed-out failure panel use a coloured 2px left border, an idiom the system
  does not name.
- The gallery's notices and undo snackbar sit 32pt from the screen edge because they render inside the screen's 16pt
  padding; the detail's sit at 16pt.

## Expected

One icon library, one family, one callout idiom, and one toast inset across the two screens. Nothing here changes
behaviour.

## Evidence

- `apps/mobile/src/shared/components/SignedOut/SignedOut.tsx`: the arrow glyph and the left border.
- `apps/mobile/src/shared/components/NotFound/NotFound.tsx`: the label without `fontFamily`.
- `apps/mobile/src/views/playlist/SyncBand/SyncBand.tsx`: `styles.error`.
- `apps/mobile/src/views/library/PlaylistGallery/PlaylistGallery.tsx` and the detail's snackbar and notice offsets.

## Acceptance criteria

- [x] The signed-out arrow is a Tabler icon at `icon-sm`.
- [x] `NotFound`'s label uses the UI family.
- [x] Both failure callouts use the existing `surface` plate and the line rule, not a coloured left border.
- [x] The gallery's notices and snackbar take the detail's 16pt inset.

## Outcome

The signed-out action's `↗` text is now `IconArrowUpRight` at `icon-sm` from Tabler, and the unused arrow style is gone.
`NotFound`'s back label carries `fontFamily`.

The run band's failure callout and the signed-out failure panel both use the system's surface plate: a 1pt `line`
border, `radius-card` and the `surface` ground, with the failure tone kept on the sentence. The coloured left border is
gone from both.

`Notice` gained the `horizontalInset` the snackbar already had. The gallery passes 0 so its 16pt parent padding leaves
the same 16pt screen edge the detail has; the gallery snackbar passes 0 for the same reason. The signed-out door
screenshot shows the Tabler arrow, and the failure plates are covered by the component suites.

## Verification

`rg "↗" apps/mobile` returns nothing. `pnpm --filter @playliberty/mobile run test`,
`pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass. Screenshots of the
signed-out door, a failed run and a gallery notice show the new surfaces.
