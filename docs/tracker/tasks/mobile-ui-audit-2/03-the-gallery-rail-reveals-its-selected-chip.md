# 03: The gallery rail reveals its selected status chip

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The gallery rail now carries the detail's reveal, gated on a chip press. It measures its viewport, the chips' left
edge and each chip's box, and scrolls the picked chip inside a 12pt margin when it is past either edge, without
animation when reduced motion is on. The rail does not move on its own: the first load keeps the scope pair in view,
and once a chip has been picked, a later layout or content resize keeps that chip in view.

The scope pair and the status chips still share one rail. The gallery test fires the rail's layout, the chips' offset
and the chip boxes, asserts the rail is still at its start, then presses a chip and asserts the computed offset. On
the emulator the gallery opens on the scope pair, and tapping the clipped "Toutes les pistes" chip scrolls it fully
into view.
