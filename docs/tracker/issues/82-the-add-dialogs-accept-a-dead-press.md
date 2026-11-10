# 82: The add dialogs accept a dead press

**State:** `resolved`
**Category:** `bug`

## Outcome

The add-track primary is disabled until both a non-empty video link and at least one playlist are present, so it cannot be pressed into the old silent return. The add-playlist primary is disabled while its link field is empty or whitespace, and becomes enabled as soon as a value is typed. Both keep their existing schema messages and submit paths for any value that can be sent.

A scrim click or Escape on a dialog with a typed link now asks before closing. The same dialog swaps its actions for `Keep editing` and `Discard`, with an alert sentence naming the loss; `Keep editing` returns to the form with the paste intact, and `Discard` calls the existing close seam. The Cancel button remains an explicit close.

The new tests cover the add-track primary needing both a link and a playlist, the disabled empty playlist field, and the dirty scrim confirmation in both dialogs; the library integration holds the empty primary disabled too.
