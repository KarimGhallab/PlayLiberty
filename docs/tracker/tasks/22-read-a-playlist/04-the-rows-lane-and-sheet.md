# 04: The row's lane and sheet

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-track-rows-draw-and-play.md), and the human install of `expo-clipboard` (the repo rule
bars the agent from installing packages).

## What to build

The row's lane opens a bottom sheet for that track. The sheet holds Copy link, Retry and Fetch whole. Remove joins in
`05`.

Copy link is universal and writes the track's absolute detail address to the clipboard, built from the configured
origin and carrying the track parameter, and confirms success or explains a refusal. Retry is drawn for a failed
track and a write collaborator. Fetch whole is drawn for a failed track with the skip setting on and a write
collaborator. Copy link stays available while a mutating action or a read is in flight; the mutating items drop.

A row's busy state locks Retry and Fetch whole. A refusal is the problem's title in a notice and leaves the sheet in
a known state. The sheet closes on the backdrop, the handle and a chosen item.

## Acceptance criteria

- [ ] The lane opens a sheet with Copy link for every access and every row state.
- [ ] Retry is drawn only for a failed track and a write collaborator; Fetch whole only for a failed track with the
      skip setting on and a write collaborator.
- [ ] Copy link writes the absolute detail address and confirms success; a refused copy is explained.
- [ ] A busy row locks Retry and Fetch whole but keeps Copy link.
- [ ] A refused Retry or Fetch whole is explained in a notice.
- [ ] The sheet and its items render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the sheet's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
