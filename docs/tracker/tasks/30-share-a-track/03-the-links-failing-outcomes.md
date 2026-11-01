# 03: The link's failing outcomes

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-playlist-link-opens-at-its-track.md) and [`02`](02-the-bare-track-link-plays-alone.md)

## Outcome

The `trackLink` copy is now one shared module, and the left-playlist handoff is a transient flag consumed once across
the replace, never a URL parameter.

The detail redirects to the bare track only for a 404 playlist read; a network or server failure keeps the detail's
normal read failure. When the queue read finds no association, the detail holds the left-playlist flag and redirects
to the bare track; when the association exists but cannot play, it stays and shows the cannot-play notice with its
reason. The bare route shows the not-available notice for a failed track read and the cannot-play notice for a known
track that is not stored; a playable track reached after the left-playlist redirect plays alone and carries the left
notice. The bare entry's redirect baseline keeps the address on a failed entry and replaces it only when a queue
started from the gallery changes what plays.

## Verification

- Mobile: 455 tests across 49 suites. The detail covers the 404 redirect, the non-404 read failure, the left-playlist
  redirect and handoff, and the unplayable notice. The bare entry covers the unknown notice, the unplayable notice,
  the left-playlist notice on playback, and the existing queue and address cases.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On `emulator-5554`: a link to an unplayable track in Chine stayed on the detail with its cannot-play notice; a link
  to a track outside Paradis landed on the bare track with the left-playlist notice; a link to an unknown playlist
  landed on the bare track with no playlist notice; an unknown bare track kept the gallery with the not-available
  notice.

See [`30-share-a-track`](../../specs/30-share-a-track.md).
