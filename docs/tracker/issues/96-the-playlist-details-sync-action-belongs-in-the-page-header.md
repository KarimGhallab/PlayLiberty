# 96: The playlist detail's sync action belongs in the page header

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The detail's sync action now sits in the page's top row beside the language control and the add, drawn with the gallery's sync control: a square around its glyph where a pointer can hover, the words out on hover, focus or while the run is in flight, and a spinner with `Syncing the playlist...` during the run. The detail passes `Sync the playlist` and `Syncing the playlist...`; the gallery still passes its count-derived words. One component now owns the shape and the animation for both scopes.

The button starts the playlist the page is open on, and only that one. It is absent for a reader, while the empty state's own start or a failed run's retry owns the action, and disabled while the playlist delete is deferred.

The playlist header no longer draws the named sync. Its state line is the playlist's own status again, as it was before the control was added, and the meta line no longer wraps. The unused sync styling is gone, so the space the control held is back in the header rather than left as a gap.

The control was checked at 1280 with a pointer, hovering from its resting square to its words, and at 390 with touch emulation, where the words are always out; the top row wraps to a second line there so `Synchroniser la playlist` stays whole. The e2e suite was not run here because it needs the full instance; its sync journey still uses the gallery's menu, which this change does not touch.
