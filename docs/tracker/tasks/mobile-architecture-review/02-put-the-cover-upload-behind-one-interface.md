# 02: Put the cover upload behind one interface

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The mobile cover sheet and the web cover dialog repeat the same upload rules: the accepted image types, the 5 MB limit, the zoom step, the discard and remove confirmations, the crop payload and the submit sequence. The crop math is shared in `ui-foundation`; the state around it is not.

Both views are large. Their tests render the whole surface to reach the rules.

## Expected

`@playliberty/ui-foundation` exports one cover upload state machine over the existing `coverCrop` math. It holds the chosen file descriptor, the type and size verdict, the zoom, the pan, the discard and remove confirmations, the busy lock and the submit payload.

Each client maps its picker to a descriptor and renders the state. The picker, the stage and the gesture stay platform code. The server remains the authority on normalisation.

The duplicate constants and confirmation logic leave both views.

## Evidence

`apps/mobile/src/views/library/CoverSheet/CoverSheet.tsx` repeats `ACCEPTED_TYPES`, `MAX_BYTES` and `ZOOM_STEP` at lines 53 to 55. It holds the gesture responder from line 234 to 777 and the submit path after line 386.

`apps/web/src/shared/components/CoverDialog/CoverDialog.tsx` repeats the same constants at lines 23 to 26, the validation at 191 to 207 and the confirm flow at 223 to 250.

`packages/ui-foundation/src/coverCrop/coverCrop.ts` already owns the framing math. `apps/server/src/features/playlists/cover/normalizeCoverImage.ts` owns the server limits at lines 6 to 12.

The report for this review is `/tmp/architecture-review-20261108-151358.html`, candidate 3.

## Acceptance criteria

- [ ] `@playliberty/ui-foundation` exports one upload state machine. It has no React, DOM or React Native dependency.
- [ ] The state machine owns the type check, the size check, the zoom and pan bounds, the discard confirmation, the remove confirmation, the busy lock and the crop payload.
- [ ] The web dialog and the mobile sheet keep their current flows for choose, crop, zoom, pan, discard, remove and submit.
- [ ] Neither view declares its own accepted types, size limit or zoom step.
- [ ] The state machine tests cover a wrong type, an oversize file, the crop fractions, discard, remove and submit.
- [ ] The server still normalises the file. The client check is a pre-check only.

## Verification

`pnpm --filter @playliberty/ui-foundation test`, `pnpm --filter @playliberty/web test -- src/shared/components/CoverDialog`, `pnpm --filter @playliberty/mobile exec jest src/views/library/CoverSheet`, `pnpm run build`, `pnpm run lint:check`.
