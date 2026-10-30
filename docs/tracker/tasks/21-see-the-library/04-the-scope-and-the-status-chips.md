# 04: The scope and the status chips

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md)

## What to build

One horizontally scrolling row above the grid. The ownership scope is All and Shared with me, each with a count of playlists; the pair is absent when nothing is shared with the account, and the shared scope takes the shared hue while it is in force. The status chips are All and the five file states, each with a count of tracks over the scope; a state with no tracks is not drawn, and All is named "All tracks" while the scope pair is drawn so the two Alls never count different things. A chip filters the grid to the playlists carrying at least one track in that state.

The scope and the chip are client state for the visit: no stored value and no route parameter. Leaving the screen clears both.

The first gallery read requests the route's maximum page, so the counts are whole up to that size; later pages append beyond it and the counts follow the loaded pages.

## Acceptance criteria

- [ ] The scope pair is absent when nothing is shared with the account.
- [ ] The scope counts playlists and the chips count tracks over the scope.
- [ ] A status with no tracks is not drawn.
- [ ] All is named "All tracks" while the scope pair is drawn.
- [ ] The row scrolls horizontally rather than clipping.
- [ ] A chip filters the grid to the playlists carrying that state.
- [ ] The scope and the chip are cleared when the screen is left.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`.
