# 03: Copy a track's link from its row

**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

## What to build

Every track row offers Copy link as the first lane item, with the share icon, and the row menu is drawn on every row. The item copies the absolute `/playlists/P?track=T` for that row's track, whether or not the track is playing, and reports success or failure. A row whose download or queue read is in flight opens a menu holding Copy link only, so no mutating action gains a state it did not have.

## Acceptance criteria

- [ ] Copy link is present first in the lane on every row, every access level and every track state, and the dots trigger is drawn on every row.
- [ ] A downloading, busy, pending or starting row opens a menu with Copy link only; retry, fetch-whole and remove keep their current availability otherwise.
- [ ] The copied value is the absolute playlist URL with that row's track, whether or not it is playing.
- [ ] Success shows "Link copied"; a rejected clipboard shows "The link could not be copied." Neither is the refusal notice.
- [ ] The row test covers the universal item and the gated menu; the playlist detail page test covers the URL and both toasts with the Clipboard API stubbed.
- [ ] Keyboard focus, the accessible name and the touch target are unchanged.

## Verification

- `pnpm run build` and `pnpm run lint:check` pass.
- The track row tests and the playlist detail page copy tests pass.

See [`18-share-a-track`](../../specs/18-share-a-track.md).
