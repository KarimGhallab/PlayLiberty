# 10: The skip setting

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## What to build

A settings row inside the identity block draws the playlist's skip-non-music value as a switch. An owner or a write
collaborator flips it, the mutation writes the playlist and the control reports its in-flight state. A read
collaborator sees the same row disabled, not hidden. A refusal is a notice and the switch returns to the saved value.
The setting is not retroactive, which the surrounding copy already says.

## Acceptance criteria

- [ ] The switch draws the playlist's saved value.
- [ ] Flipping it writes the new value for an owner or a write collaborator and reports its in-flight state.
- [ ] A read collaborator sees the switch disabled, not hidden.
- [ ] A refused change returns the switch to the saved value and shows a notice.
- [ ] The row and its notice render in French.

## Verification

`pnpm --filter @playliberty/mobile run typecheck`, the setting's and detail's Jest files, then `pnpm run build` and
`pnpm run lint:check`.
