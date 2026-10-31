# 03: The share journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-grant-and-change-a-level.md)

## Outcome

`apps/mobile/.maestro/detail-share.yaml` opens `OWNED_PLAYLIST`, opens Share, and starts from a state where
`SHARE_ACCOUNT` holds nothing: if the row is already there, it revokes it and confirms first.

It grants read from Add with `share-picker-level-read`, then reopens Add and asserts that level is selected. It
presses `share-picker-level-write`, reopens Add again, and asserts write is selected. It closes the picker, revokes
the share, confirms the inline question, and waits for the account's name to leave the sheet. It ends in the
gallery.

Rows are found by `SHARE_ACCOUNT` and the picker's controls by their ids, so no copy is read and the flow survives
either language. It reads no email address and no role.

The README records `SHARE_ACCOUNT`, the flow's row, the picker's three rules, and that the account must not be the
signed-in owner of `OWNED_PLAYLIST`.

## Verification

- The flow passed twice in a row on the emulator with `OWNED_PLAYLIST=Paradis` and `SHARE_ACCOUNT=Dev User`, the
  second starting from the private state the first left.
- A third run started with a share seeded for that account and playlist. The reset branch revoked it, then the
  read grant, the write change and the confirmed revoke passed, and the database held no share afterwards.
- No source changed; the flow and the README are the ticket's artifacts.

See [`26-share-a-playlist`](../../specs/26-share-a-playlist.md).
