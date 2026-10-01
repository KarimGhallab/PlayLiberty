# Design the form controls

Status: resolved
Labels: `enhancement`

## Outcome

`docs/design/components/form-controls.html` draws the button, text input, checkbox, radio, segmented control, switch, dialog and emphasis pattern. The seven decisions it forced (control boundary at 3:1, measured disabled state, busy versus disabled, hover lifts the accent, border-only focus on text inputs, the shared emphasis and downloading literal, and the segmented control's rule selection) are owned by [`form-controls.md`](../../design-system/components/form-controls.md).

## Verification

`pnpm run design:check` passes, and every interactive element is reachable by keyboard with a visible focus indicator.
