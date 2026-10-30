# 06: The bulk sync

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md), [`04`](04-the-scope-and-the-status-chips.md)

## What to build

The header's bulk sync reads "Sync all {count}", where the count is the playlists the visible scope and chip show that the account can write and that are not already syncing. The control is absent when the count is zero. A press freezes the set and starts one sync per playlist, one at a time; a playlist already syncing is counted and the loop goes on; any other refusal stops the loop. The tally names what started, what was already running, or what stopped it, and it is drawn on the app's notice surface: a transient message that does not block and withdraws itself. The control holds its busy state until a gallery read taken after the batch settles finds none of it running.

## Acceptance criteria

- [ ] The control names its count and is absent when there is nothing to sync.
- [ ] A press freezes the set and starts one sync per playlist, one at a time.
- [ ] An already-running playlist is counted and the loop continues.
- [ ] Any other refusal stops the loop and is named in the tally.
- [ ] The busy state holds until the read after the batch settles.
- [ ] The notice does not block and withdraws itself.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck`. The bulk sync's tests cover the count, the loop, the tally and the busy state; the notice's timing is not asserted.
