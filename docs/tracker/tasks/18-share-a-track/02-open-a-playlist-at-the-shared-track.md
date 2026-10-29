# 02: Open a playlist at the shared track

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## What to build

Opening `/playlists/P?track=T` starts the playlist unshuffled with `T` at its own place in the order, whether the recipient owns the playlist or holds a read or write share on it. The address bar mirrors the playing track while `P` is the queue, so copying it shares the track now playing. Entry is idempotent, a reload restores the queue paused, and the degraded links are left to ticket 05.

## Acceptance criteria

- [ ] The playlist route accepts a non-empty `track` search param; without it the page behaves exactly as it does today.
- [ ] With access and a playable `T`, entry starts the whole playlist in source order, shuffle off, at position zero on `T`; the tracks before `T` stay before it and playback stops at the playlist's end.
- [ ] Entry is idempotent: `P` already at `T` does not restart or seek, `P` at another track jumps to `T`, and another queue starts `P` at `T`.
- [ ] While `P` is the queue, the address bar replaces `?track` with the current track on every change; when `P` is not the queue the param is absent, and `/` stays `/` while music plays.
- [ ] A reload restores the persisted queue paused at its position and does not start audio.
- [ ] The playlist detail page tests cover the entry, its idempotence and the mirror; the new two-context e2e journey proves a read share opens the playlist at the shared track.
- [ ] No-access, absent-track and unplayable branches are not claimed here; ticket 05 owns them.

## Verification

- `pnpm run build` and `pnpm run lint:check` pass.
- The playlist detail page tests and the new two-context e2e journey pass.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
