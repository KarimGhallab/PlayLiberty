# 10: The skip setting

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## Outcome

A settings row inside the identity block draws the playlist's skip-non-music value as a switch. The owner and a
write collaborator flip it; `useUpdateSkipNonMusic` moves the cached playlist on the press, writes the playlist and
asks the library again. A refusal restores the saved value and draws the notice, with the problem's own sentence
under it. A read collaborator sees the same row disabled, never hidden. The setting is not retroactive, so no track
read moves.

All copy was already in both catalogs: `skipSetting.label`, `detail.settingNotice` and `detail.settingFailed`.

## Verification

- Skip setting 3 tests, its write 2 tests, detail 73 tests; mobile 287 tests across 37 suites.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, the shared Chine detail drew the row under the identity with the switch on. A flip persisted
  (`skip_non_music` moved 1 to 0 and back to 1).

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
