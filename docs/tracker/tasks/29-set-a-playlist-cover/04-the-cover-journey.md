# 04: The cover journey

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-crop-stage-frames-the-cover.md)

## What to build

A Maestro flow for the cover's critical journey. It opens `OWNED_PLAYLIST` from the gallery, opens the cover sheet
from its actions, chooses a fixture image from the emulator's photo library, pans and zooms, saves, leaves the
playlist for the gallery, returns, and asserts the same square is drawn. It ends with the cover removed so the run
can repeat, using the sheet's one-press Remove confirmation.

The fixture image is pushed to the emulator before the flow and named in the README. The system photo picker is the
one surface the flow taps by position or by its own labels; everything after it is found by id. The flow reads no
app copy, and the README's table names the journey and explains the picker step.

A reader's card is not part of this journey: the unit seam already owns the absent Cover item.

## Acceptance criteria

- [ ] With `OWNED_PLAYLIST` naming an owned playlist and the fixture in the library, the flow chooses, frames, saves
      and sees the same square after leaving and returning.
- [ ] It removes the cover at the end and ends in the gallery.
- [ ] The picker is the only surface selected by anything other than an app id.
- [ ] The README documents the fixture, the flow's row and the picker step.

## Verification

- `maestro test --udid emulator-5554 -e OWNED_PLAYLIST=Paradis apps/mobile/.maestro/gallery-cover.yaml` passes twice
  in a row, and the second run starts from the fallback cover.
