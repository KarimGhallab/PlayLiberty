# 07: The dial label presses and reads once

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The label pill is a `View`; only the 44dp icon takes the press. Tapping the label hits the scrim and closes the
dial. The label text and the icon button carry the same verb, so TalkBack reads each row twice.

## Expected

The whole row is the press target, and the row has one accessible name. A press outside the rows still closes the
dial.

## Evidence

- `apps/mobile/src/shared/components/ActionDial/ActionDial.tsx`: the label `View` and the icon `Pressable`.
- The emulator dump: the icon button is the only clickable node in the row; the label is a separate text node.

## Acceptance criteria

- [x] A press anywhere on the label or the icon runs the action.
- [x] The label is not a separate accessibility node; the row has one name.
- [x] The scrim still closes the dial on a press outside the rows.
- [x] A test presses the label and asserts the action, and an accessibility test asserts one node.

## Outcome

The row is one `Pressable`: the label pill and the icon box are its children, so a press anywhere in the row runs the
action and the row carries the one accessible name. The pressed state darkens both surfaces. The scrim is unchanged
and still closes the dial on a press outside the rows.

A new dial test presses the label text, asserts the action, asserts the label sits inside the row's button, and closes
from the scrim. The emulator dump lists one `gallery-add` node spanning the label and the icon, with no separate label
node, and tapping the label opened the add sheet.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass. The emulator
shows the label pressing and one TalkBack stop per row.
