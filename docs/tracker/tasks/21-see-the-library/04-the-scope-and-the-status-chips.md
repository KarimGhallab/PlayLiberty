# 04: The scope and the status chips

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md)

## Outcome

The gallery now draws one horizontally scrolling filter row above the grid. The ownership scope is All and Shared with me with a count of playlists each; the pair is absent when nothing is shared, and the shared scope takes the shared surface, border, label and glyph while it is in force. The status chips are All and the five file states with track counts over the scope; a state with no tracks is not drawn, and All is named "All tracks" while the scope pair is drawn so the two Alls never count different things.

A chip filters the grid to the playlists carrying at least one track in that state, and the scope narrows the counts and the grid together. The scope and the chip are local state for the visit: leaving the screen clears both, and a status the new scope no longer carries returns the rail to All.

The new `Chip` is the app's one interactive chip: a border, a label, an optional count and a tone dot that appears when selected. The `GalleryFilterBar` owns the rail; the gallery owns the state.

The first gallery read now asks the route's maximum page, 200, so the counts are whole up to that size. The API client gained a query argument so a read can carry it without a caller writing a `?` into a path.

## Verification

- Mobile 107 tests across 18 suites, including the gallery's 14 and the API client's 5.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
