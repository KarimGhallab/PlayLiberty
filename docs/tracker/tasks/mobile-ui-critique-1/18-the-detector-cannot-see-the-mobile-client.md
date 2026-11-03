# 18: The design detector cannot see the mobile client

**Status:** resolved
**Labels:** `enhancement`, `ready-for-human`
**Source:** [A design critique scores the mobile app 26/40](../../issues/108-a-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Needs the record placed where audits read it.

## Observed

`impeccable detect --json apps/mobile/src apps/mobile/app` returns exit 0 and an empty array over 215 files. A paired
control shows the result is vacuous: the same colour and size values written as a CSS declaration produce four
findings (`low-contrast`, `tiny-text`, `undersized-ui-text`), and written as a React Native `StyleSheet` object they
produce none. The engine resolves markup and CSS, not JSX and RN style objects, so it cannot see this client's text
colours, sizes, hit areas or accessibility props.

A future audit that runs the detector, sees zero findings and records a pass will be asserting something the tool
never examined. Nothing in the repo currently says so, and three audits of this app have already run.

## Expected

The mobile audit recipe states that the detector is blind to `apps/mobile` and names what replaces it: touch targets
measured on the device, contrast computed from `packages/tokens/src/values.ts`, labels and roles read from the tree
with `uiautomator`, text scale exercised at 1.0, 1.3 and 2.0, and reduced motion toggled at the system level.

## Evidence

- `impeccable detect --json apps/mobile/src apps/mobile/app`: exit 0, `[]`.
- The paired probe described above, run 2026-11-03.
- The mobile sections of `AGENTS.md` and the audit task folders, none of which mention the limitation.

## Acceptance criteria

- [x] The limitation is recorded once, where a mobile audit starts (`AGENTS.md`, or the mobile audit task
      conventions).
- [x] The replacement checks are listed with the exact command or file each one reads.
- [x] No issue in the tracker cites a clean detector run as evidence about the mobile client.
- [x] The record does not restate the web client's rules, which the detector can see.

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
