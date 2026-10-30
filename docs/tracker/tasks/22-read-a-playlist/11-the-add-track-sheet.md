# 11: The add-track sheet

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## What to build

The detail carries a floating action for an owner or a write collaborator. It opens a sheet with a video link field
and a checklist of the playlists the gallery read returns with owner or write access, capped at the first gallery
page and saying so. The current playlist is preselected. A read collaborator sees no action.

The link is validated before the request is sent and the schema's refusal stays in the sheet. A typed link asks once
before the sheet is discarded. One batch request submits every chosen playlist, and the sheet draws one outcome per
chosen playlist in the order chosen: added, already present or refused. A refused outcome names the playlist and says
only that it was refused. A mixed result keeps the sheet open. Add reports its busy state so two presses do not add
twice, and the keyboard does not cover the Add control.

## Acceptance criteria

- [ ] The floating action is drawn only for an owner or a write collaborator.
- [ ] The checklist holds the writable playlists from the first gallery page, says it is the first page, and
      preselects the current playlist.
- [ ] An invalid link is refused before the request is sent and the sheet stays open.
- [ ] A typed link asks once before the sheet is discarded.
- [ ] The batch draws one outcome per chosen playlist in the chosen order; a refused outcome names the playlist and
      gives no reason; a mixed result keeps the sheet open.
- [ ] Add reports its busy state, and the keyboard does not cover it.
- [ ] The sheet and its outcomes render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the sheet's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
