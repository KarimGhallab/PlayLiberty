# 01: The pin journey pins and unpins

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`gallery-pin.yaml` now proves the whole journey. It pins the card named by `PIN_PLAYLIST` from the rest group's
actions control, found by the group-qualified id plus the card's own name rather than by index. It scrolls the page
back to the Pinned heading, sweeps the pinned row once at 33% height to bring the later cards in, asserts the same
card under Pinned, reopens that card's sheet, unpins it, and asserts it has left the pinned row and is back in the
rest group.

The flow reads no copy and ends in the library. The heading's disappearance when the last pin goes stays with the
gallery's unit seam; the verification account holds two other pins, so the run proves the card's move instead.

The actions control's id and name combine in one Maestro selector, so no test seam was needed and no source changed.
The README's row now names the round trip, and a new paragraph records why the flow names its card and sweeps the
row.

See [`28-pin-a-playlist`](../../specs/28-pin-a-playlist.md).
