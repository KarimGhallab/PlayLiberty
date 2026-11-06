# 05: The status rail hides its own selection

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The rail reveals a chip only after the user picks one, so the default selection is never brought into view. At
`font_scale 1.0` the library's selected "All tracks 1275" is cut mid-count on first paint; at `2.0` the whole status
rail sits off-screen behind the scope pair with no visible edge. The detail's rail behaves the same way, and the
retained chip is last, so the product's newest evidence is the farthest chip from the start.

## Expected

The selected chip is fully visible at rest, including the default, on both rails. At large text the scope pair does not
consume the whole width, or the rail shows a persistent affordance that more chips exist.

## Evidence

- `apps/mobile/src/views/library/GalleryFilterBar/GalleryFilterBar.tsx:102-106`: the reveal flag starts false for the
  default selection, by a comment that says the rail stays at its start.
- `:146-152`: the reveal is skipped while neither flag is set.
- Screenshots `a-lib-01.png` (clipped default), `a-detail-01.png` (clipped "Stored 6"), `a-scale2-lib.png` (no status
  rail visible).
- `uiautomator`: the selected chip is focusable while partly off-screen.

## Acceptance criteria

- [x] The default chip is fully visible on first paint at 1.0 on both rails.
- [x] A non-default selection restored from state is still revealed on first measurement, without a tween.
- [x] At 1.3 and 2.0 the status rail keeps a visible edge, or the scope pair moves to its own row.
- [x] The retained chip is reachable in at most one swipe at 1.0.
- [x] No layout shift on first measurement.

## Verification

Cold-start the library on the emulator and read the rail at 1.0, 1.3 and 2.0; the selected chip is whole at each size.
Then `pnpm --filter @playliberty/mobile test`.

## Outcome

Implemented on 2026-11-06, with the user's rule kept: the default status chip is never scrolled to.

The rail's fixed prefix was the cause, so the words got shorter rather than the scroll: the scope pair reads `Shared` /
`Partagées` instead of `Shared with me` / `Partagées avec moi`, and the default status chip reads `All` / `Toutes` instead
of `All tracks` / `Toutes les pistes`. The gallery's default chip is now fully visible at 1.0 in French, the longest
catalog, and in English.

From 1.3 the scope pair moves to its own row (`stacksScope`, with a 0.005 tolerance because the platform stores 1.3 as
1.29999995). The status rail then owns the full viewport: its default chip is whole and the end fade marks that more
chips follow. The pair stays a compact pill, left-aligned above the rail. Below 1.3 the pair stays inline.

The default `All` chip is never auto-scrolled. The gallery keeps its existing rule (reveal only a chosen or restored
non-default chip, restored without animation). The detail's rail gained the same split: a restored non-default filter is
revealed on its chip's first measurement without a tween, a tapped one is revealed with the animation, and the default
is left where it rests.

Verified on the emulator at 1.0, 1.3 and 2.0 in French (`/tmp/opencode/t05/lib-1.0-fr.png`, `lib-1.3-fr3.png`,
`lib-2.0-fr.png`): the default chip is whole at each size, the pair stacks from 1.3, and one swipe at 1.0 brings the
retained chip onto the screen (`rail-swiped-1.0.png`).

`GalleryFilterBar.test.ts` pins the stacking threshold; the new `PlaylistControls.test.tsx` pins the detail's restored
reveal (no tween) and the default's silence; the gallery's existing reveal tests still pass.

Checks: mobile and web typechecks and suites pass. The root build, lint and unit run follows in the batch for this
session.
