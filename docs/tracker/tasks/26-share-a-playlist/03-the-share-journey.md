# 03: The share journey

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`26-share-a-playlist`](../../specs/26-share-a-playlist.md).
