# 05: The add sheet

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-sheet-frame-for-the-app.md), [`03`](03-the-gallery-states.md)

## What to build

The add control is the floating round action on a gallery with items, and it is absent when the gallery is empty; the empty gallery's own labelled action opens the same sheet. The sheet holds the playlist link field, the skip-non-music switch defaulting on, Cancel and Add. Add is disabled while busy and shows the busy state. A malformed link is refused before the request; a server refusal is shown in the sheet. A typed link asks once before the sheet is discarded. A successful create closes the sheet and leaves the person in the gallery, with the new playlist arriving from the server already syncing.

## Acceptance criteria

- [ ] The floating action is present on a gallery with items and absent on an empty one.
- [ ] The empty gallery's action opens the same sheet.
- [ ] A malformed link is refused before the request.
- [ ] The skip switch defaults on.
- [ ] Add is disabled while busy and shows the busy state.
- [ ] A typed link asks once before the sheet is discarded.
- [ ] A server refusal is shown in the sheet.
- [ ] A successful create closes the sheet and the gallery reads again.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`. The add sheet's tests cover the schema refusal, the busy state, the discard confirmation and the skip default.
