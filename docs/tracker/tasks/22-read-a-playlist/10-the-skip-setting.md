# 10: The skip setting

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

A settings row inside the identity block draws the playlist's skip-non-music value as a switch. The owner and a
write collaborator flip it; `useUpdateSkipNonMusic` moves the cached playlist on the press, writes the playlist and
asks the library again. A refusal restores the saved value and draws the notice, with the problem's own sentence
under it. A read collaborator sees the same row disabled, never hidden. The setting is not retroactive, so no track
read moves.

All copy was already in both catalogs: `skipSetting.label`, `detail.settingNotice` and `detail.settingFailed`.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
