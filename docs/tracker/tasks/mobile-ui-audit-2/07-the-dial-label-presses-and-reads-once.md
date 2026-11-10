# 07: The dial label presses and reads once

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The row is one `Pressable`: the label pill and the icon box are its children, so a press anywhere in the row runs the
action and the row carries the one accessible name. The pressed state darkens both surfaces. The scrim is unchanged
and still closes the dial on a press outside the rows.

A new dial test presses the label text, asserts the action, asserts the label sits inside the row's button, and closes
from the scrim. The emulator dump lists one `gallery-add` node spanning the label and the icon, with no separate label
node, and tapping the label opened the add sheet.
