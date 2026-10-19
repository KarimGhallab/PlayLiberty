# 66: The filter rail hides a chip at desktop widths

**State:** `resolved`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Outcome

The rail wraps at every width except a phone's, where it keeps one line and scrolls, so a desk never clips a chip behind the sort. `PlaylistFilterChips` draws the chips inside a `chips__rail` that is `flex-wrap: wrap` above 768 and `nowrap` with `overflow-x: auto` below it; `.playlistDetail__controls` aligns to `flex-start` so a second chip line does not drag the sort down with it. Measured on "Evening Jazz" in the seeded stack: at 1440 and 1280 the rail's `scrollWidth` equals its `clientWidth` (563) and all six chips are whole, and at 390 the rail still scrolls, now with a 24px fade drawn at whichever edge hides a chip.

The overflow is measured rather than guessed. `useRailOverflow` reads `scrollLeft`, `scrollWidth` and `clientWidth` on every layout pass, on scroll, and on a `ResizeObserver` change, and answers `none`, `start`, `end` or `both`; the component writes it to `data-overflow` and the stylesheet fades the matching edge. Tabbing to a chip needs no code of its own: the browser scrolls a focused element into view inside its own scroll container, which the journey confirms at 390.

`e2e/tests/arrange.spec.ts` holds it: one journey asserts every chip's own right edge still resolves to that chip at 1440 and 1280, then focuses the last chip at 390 and asserts the same of it. With the rail forced back to `nowrap` at a desk the first half fails, which is the reported clipping.

`docs/DESIGN.md` now records the arrangement instead of the old "chips scroll sideways rather than wrapping" claim.

Verification: `pnpm run build` and `pnpm run lint` clean; the web unit suite passes (478 tests); `playwright test arrange --project=chromium` passes.
