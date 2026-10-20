# 33: The touch targets and the phone width

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`

## Outcome

All three controls now reach 44x44 without changing what they draw, and the phone width has its own Playwright project.

Each of the three grows a `::before` of exactly `var(--control-touch)`, centred on the control. The first cut sized that box from the drawn border box with a negative `inset`, which was 2px short on every one of them: an absolutely positioned pseudo-element is contained by the _padding_ box, so the 1px border came off the target. A centred 44px box has no such arithmetic, and the measurement test is what caught the difference.

- `VolumeControl.module.scss`: the mute gains `position: relative` and the target; it draws 36x36 as before.
- `PlaylistSkipSetting.module.scss`: the switch gains the target. Its 11px vertical reach sits inside the 20px gap the detail's side column keeps between blocks, and no ancestor clips it: on a phone `__left` is `display: contents`, so its `overflow-y: auto` generates no box. The drawn box stays 40x22.
- `TrackRow.module.scss`: the lane control gains `position: relative` and the target; it draws `--control-size-inline` (28x28) as before. The lane stacks above the row's own play layer, so the grown box takes the presses at its edge, which is the trade this ticket named.

`e2e/tests/phone.spec.ts` is the phone width, and only it, so a desk layout cannot satisfy it:

- The `phone` project runs 390x844 with `hasTouch` and `isMobile`, restricted by `testMatch` to that file while `chromium` takes `testIgnore`, so the desk suite runs what it always ran and the project cost is the four journeys below.
- `the gallery draws the phone grid` reads the first two items' boxes: they share a row and the second is to the right of the first. That is the card grid's own 160px minimum, which the desk's 232px tile cannot fit two of in 390.
- `a tap above the seeker moves the playhead` pauses, then taps 10px above the 4px track with a raw touch and asserts the browser's own `currentTime` moved backwards.
- `a tap above the mute silences the player` taps 2px above the 36px button and asserts `HTMLAudioElement.muted` flips and the control renames itself to Unmute.
- `every control reaches the touch target it owes` probes 1px inside the edge of the 44x44 each control owes, on all four sides, with `document.elementFromPoint`, and asserts the drawn box is unchanged: 36x36, 40x22, 28x28.

Measured in a browser, not read off the rule, and proved load-bearing: with the row's target removed the measurement test fails on all four sides, and with the phone grid's `minmax(160px, 1fr)` put back to the desk's `232px` the gallery test fails on two items sharing a row.

`grep -c 'var(--control-touch)' apps/web/src` is 6, across the three stylesheets.

Verification: `pnpm run build`, `pnpm run lint` and the unit suites pass (`apps/web` 46 files / 466 tests, all workspaces green); `pnpm test:e2e` is 34 passed (30 on `chromium`, 4 on `phone`) in 1.6m; `impeccable detect apps/web/src` reports no findings.

Recorded by the web-client audit as item 4 of [`58-the-web-clients-unkept-contracts`](../issues/58-the-web-clients-unkept-contracts.md), whose brief and verification are kept below rather than dropped as the convention has it, because this ticket was written and closed in one uncommitted pass, so git holds no other copy.

## Objective

Three controls are smaller than the 44px the token system defines, none of them grows the no-paint hit box the player's controls already use, and the phone arrangement has no end-to-end coverage. Close both: the skip switch, the track row's overflow and the volume mute each reach 44x44 without changing what they draw, and a Playwright project at 390x844 with touch renders that arrangement and exercises the seek and mute gestures.

Recorded by the web-client audit as item 4 of [`58-the-web-clients-unkept-contracts`](../issues/58-the-web-clients-unkept-contracts.md).

## Context

Read `docs/ARCHITECTURE.md` (the web stack) and the testing guideline first.

- `--control-touch` is 44 (`packages/tokens/src/values.ts:69`) and has no use in `apps/web`.
- The pattern to reuse exists three times: `PlayerBar.module.scss:143-146` (`inset: -6px`, the transport's steps), `PlayerBar.module.scss:245-248` (`inset: -20px 0`, the seeker) and `VolumeControl.module.scss:88-91` (`inset: 0 -20px`, the volume rail). All three leave the drawn geometry alone and grow a box that paints nothing.
- [`12-the-player-seeker-and-the-volume-rail-fail-touch`](../issues/12-the-player-seeker-and-the-volume-rail-fail-touch.md) resolved the seeker and the rail on this pattern and recorded that the mute button kept its behaviour and its geometry, so the button's own box is the part that pass left open.
- The app has one breakpoint, `MOBILE_QUERY` = `(max-width: 767px)` in `apps/web/src/shared/useMediaQuery/useMediaQuery.ts`, mirrored in each stylesheet that branches on it. `e2e/playwright.config.ts` runs one project, `devices['Desktop Chrome']` (1280x720), so no test renders the phone arrangement and no test synthesizes touch. The unit suites stub `matchMedia` (`apps/web/src/testing/viewport.ts`), which asserts the correct branch and never the stylesheet that branch selects.
- Issue 12 measured its work in the browser rather than in the rule. The same evidence standard applies here.

## Scope

- The three expansions read `var(--control-touch)` rather than repeating 44, so the token gains the owner it was defined for and the drawn geometry is untouched.
- `VolumeControl.module.scss` `__button` (`:12`) draws 36x36. Grow it 4px a side, and give the button `position: relative`, because it has none today and a pseudo-element inside it would otherwise resolve against `.volume`.
- `PlaylistSkipSetting.module.scss` `__switch` (`:18`) draws 40x22. The label beside it is a `<span>`, so it is not a click target and the drawn box is the whole target. Grow it to 44x44 and check the expansion against the blocks above and below it in the detail's side column.
- `TrackRow.module.scss` `__action` (`:238`) draws `--control-size-inline`, 28x28. Grow it to 44x44. The lane carries `z-index: 1` over the row's `__hit` play layer, so the grown box takes presses the play layer used to get. That is the intended trade, and the row's own `data-playable` press keeps the rest of the row.
- `e2e/playwright.config.ts`: add a second project at 390x844 with touch, so the phone arrangement is rendered and the gestures are real rather than emulated through a class name.
- At least two journeys on that project: a tap on the seeker moves the playhead, and a tap on the mute toggles the silence. A third asserting the phone arrangement is the one drawn (the library's card grid, or the detail's row header) keeps the project from passing on a desk layout.
- The project's cost is its own: `fullyParallel: false` and `workers: 1`, so a second project is a second full pass over the specs. Restricting it to the specs that matter at phone width is preferred to doubling the suite's runtime.

## Out of scope

- The audit's other findings, which stay in issue 58.
- The layouts themselves. Both arrangements are settled, and this ticket changes no geometry, no breakpoint and no copy.
- The mobile client, which does not exist, and a light theme.

## Blocking edges

None. Can start immediately. No ticket depends on it.

## Verification

- Each of the three hit areas measures at least 44x44 in the browser rather than by reading the rule: a Playwright tap, or a `document.elementFromPoint`, at a point inside the 44x44 box and outside the drawn box resolves to the control.
- The drawn geometry is unchanged: the switch still paints 40x22, the mute 36x36, the overflow 28x28.
- `grep -c 'var(--control-touch)' apps/web/src` is at least 3.
- The phone journeys pass on the new project and the existing `chromium` project still passes.
- `pnpm run build`, `pnpm run lint` and `pnpm run test` pass.
