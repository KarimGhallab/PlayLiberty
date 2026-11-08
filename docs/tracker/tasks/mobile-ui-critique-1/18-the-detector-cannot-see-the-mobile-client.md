# 18: The design detector cannot see the mobile client

**Status:** resolved
**Labels:** `enhancement`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

`AGENTS.md` gained an `Audits` section whose `Mobile UI audit` subsection states the blindness once, in the file every
audit reads first: the detector exits 0 with an empty array because it resolves markup and CSS, not JSX and React
Native style objects, so an empty result is not a pass and no issue may cite one. The same paragraph carries the paired
control in one clause so a reader can tell the silence is structural.

The replacement checks are a table of five rows, each naming its exact command or file:

- Touch targets: the `uiautomator` dump, every `clickable="true"` node's `bounds` at 48dp or more, converted with
  `adb -s emulator-5554 shell wm density`.
- Labels and roles: the same dump, read through `content-desc`, `class`, `checkable`, `checked` and `enabled`.
- Contrast: `pnpm --filter @playliberty/mobile exec jest src/shared/styles/tokens.test.ts`, with any pair it does not
  cover computed from `packages/tokens/src/values.ts`.
- Text scale: `adb -s emulator-5554 shell settings put system font_scale` at 1.0, 1.3 and 2.0.
- Reduced motion: `adb -s emulator-5554 shell settings put global transition_animation_scale 0`, restored to 1.

No mobile issue cited a clean detector run, so the tracker needed no correction. Of the two files that mention the
detector, issue 108 quotes the empty result as proof that it is blind, and issue 58 is the web client, which the
detector can see. The record names no web rule.
