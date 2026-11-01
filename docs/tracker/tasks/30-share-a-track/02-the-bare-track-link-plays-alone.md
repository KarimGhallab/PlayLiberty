# 02: The bare track link plays alone

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The gallery shell moved into one shared surface, and the root route and `/tracks/{id}` both render it. The shell
keeps the session gate, the account sheet and the library body; the root route is now a thin wrapper around it.

The bare route reads the track by id through the new track read and puts it in a one-track queue with no playlist
context. The player bar draws its title and artwork with no playlist name and no artwork link, which the bar already
owned. Entry is idempotent: a queue that already holds that bare track is left alone, position included. A playlist
that was playing when the link opened is replaced by the bare track rather than redirecting the address; a playlist
started from the gallery after entry replaces the address to `/`. The failed read and the unplayable track remain
`03`'s.

## Verification

- Mobile: 448 tests across 49 suites. The bare entry covers the one-track queue and its metadata, another queue being
  replaced without a redirect, idempotent entry with the position kept, the replace to `/` when a playlist starts, and
  the signed-out case not reading or starting.
- The title-only bare bar remains the `PlayerBar`'s own test rather than a duplicate.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`, a warm `dev.playliberty.app://tracks/<id>` link showed the gallery with the bare track in the
  bar: its artwork, its title, no playlist name and no artwork link. Opening the same link again left the position at
  1:20 rather than restarting it.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
