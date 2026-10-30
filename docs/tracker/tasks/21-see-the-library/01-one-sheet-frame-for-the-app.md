# 01: One sheet frame for the app

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The account sheet owns the app's only modal frame: the backdrop, the top drag handle, the bottom safe inset, the slide and the reduced-motion jump. The add sheet and the card's actions sheet need the same frame, and copying it would give the app three sheets that drift.

## Expected

One shared sheet frame owns the backdrop, the drag handle, the safe inset, the slide and the reduced-motion jump. The account sheet uses it, and the two new sheets reuse it. A caller supplies its title, its content and its close request, so the add sheet can confirm a discard before it closes.

## Evidence

The account sheet's frame is the only modal frame in the app today. The gallery's add and actions sheets are specified as modal sheets over the gallery, with the same dismissal paths.

## Acceptance criteria

- [ ] The shared frame draws the backdrop, the top drag handle, the bottom safe inset, the slide and the reduced-motion jump.
- [ ] The backdrop, the system back gesture and a downward drag all ask the caller to close; the caller decides whether to close.
- [ ] The account sheet uses the frame and its eleven tests still pass.
- [ ] A caller can replace the content and the title.
- [ ] A caller can refuse the close request, so a sheet that cannot be dismissed while busy stays open.

## Verification

`pnpm --filter @playliberty/mobile exec jest src/shared/components/AccountSheet` and `pnpm --filter @playliberty/mobile run typecheck`.
