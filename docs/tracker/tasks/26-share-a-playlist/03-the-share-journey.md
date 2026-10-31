# 03: The share journey

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-grant-and-change-a-level.md)

## What to build

One Maestro flow, `detail-share`, proves the owner's journey end to end on the emulator.

It opens `OWNED_PLAYLIST`, then establishes its own starting state: if `SHARE_ACCOUNT` already holds the playlist,
it revokes that share first. It opens Share, opens Add, and presses Can listen on `SHARE_ACCOUNT`. The row appears
in the share list at read. It reopens Add, presses Can edit on the same account, and the row reads write. It revokes
the share, confirms the inline question, and the row is gone. It ends in the gallery.

The flow finds a share row by the account's display name and the level controls by their stable test ids, not by
copy, so it does not depend on the app's language. It never reads an email address or a role, which the directory
does not carry.

The README records `SHARE_ACCOUNT`, the flow's row, and the picker's three rules: the owner is absent, accounts that
already hold the playlist appear with their level selected, and pages append as the list reaches its end. The
account must not be the signed-in owner of `OWNED_PLAYLIST`.

## Acceptance criteria

- [ ] `detail-share` passes on the emulator with a named playlist and a second account.
- [ ] A second run passes from the state the first left: no share with `SHARE_ACCOUNT`.
- [ ] The flow asserts the read share, the write share after the level press, and the gone row after the confirmed
      revoke.
- [ ] The flow reads no email address and no role.
- [ ] The README carries the variable, the flow row and the picker rules.

## Verification

```sh
PATH="$HOME/.maestro/bin:$PATH" \
  maestro test --udid emulator-5554 \
  -e OWNED_PLAYLIST=<owned playlist> -e SHARE_ACCOUNT=<second account> \
  apps/mobile/.maestro/detail-share.yaml
```

Run it twice. No source changes; the flow and the README are the artifacts.
