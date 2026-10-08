# 07: Make the library read as a personal gallery

**State:** `resolved`
**Category:** `enhancement`

## Outcome

Implemented. The library's rows draw their cover as a blurred ground: the small derivative behind the
content, full strength at the leading edge and gone across the row, lightening on hover or focus; a
no-cover row takes the sleeve hue. The playing playlist is marked with the same `TrackBars` equalizer a
playing track row draws. The empty state offers one invitation: the header's add control is suppressed
there and the gallery is re-balanced off the top. The layout, the item and the count line are unchanged.

The ground draws the full cover, not the small derivative that was prototyped: the derivative was too
blurred, so it and its `?size=small` route were dropped, and no filter is applied either.

Verified: `pnpm run build`, `pnpm run lint`, and the unit suites (server 272, web 347).
