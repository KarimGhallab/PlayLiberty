# 05: Removal and deletion are deferred

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`04`](04-the-rows-lane-and-sheet.md)

## What to build

Remove joins the row sheet for an owner or a write collaborator. It drops the row immediately from the list, hides it
for the visit and defers the remove request for six seconds. Undo cancels the request and restores the row. A failed
request restores the row and says the removal failed.

Delete joins the header's sheet for the owner only. The detail's sheet carries Delete alone; spec `25` extends it
with the rest of the playlist's actions. It dims the detail and disables its controls, opens the same six-second undo
window and pops to the gallery when the request lands. Undo cancels the request and restores the detail. A failed
request restores the detail and says the delete failed.

One window at a time: a second removal or deletion commits the first request rather than losing it. A read
collaborator sees neither Remove nor Delete. The shared UndoSnackbar carries the sentence, the subject and the
countdown.

## Acceptance criteria

- [ ] Remove hides the row at once and Undo restores it without a request.
- [ ] Delete dims the detail, pops to the gallery when the request lands, and Undo restores the detail.
- [ ] A failed remove or delete restores the subject and explains the failure.
- [ ] A second deferred action commits the first request.
- [ ] A read collaborator sees neither Remove nor Delete.
- [ ] The sentences and the Undo control render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the detail's Jest file, then `pnpm run build` and
`pnpm run lint:check`.
