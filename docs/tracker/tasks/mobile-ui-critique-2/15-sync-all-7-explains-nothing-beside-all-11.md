# 15: "Sync all 7" explains nothing beside "All 11"

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The sync row now carries the reason as a second line.

`DialAction` gained an optional `detail`, drawn under the label inside the same bubble and exposed as the action's
accessibility hint. `PlaylistGallery` counts the read-only playlists among the visible set and passes
`library.syncAllReadOnly` only when that count is above zero, so a fully writable account sees the unchanged row with no
extra line. Both catalogs carry the message: `{count} read-only playlists are not included` and
`{count} playlists en lecture seule exclues`, with a singular form.

Verified on the emulator at 1.0 and 1.3: the dial reads `Sync all 7 playlists` with `4 read-only playlists are not
included` on one line (`/tmp/opencode/t15/dial-after.png`, `dial-1.3.png`). `PlaylistGallery.test.tsx` covers one
read-only playlist and the fully writable case where the line is absent.

The root build, lint and unit run follows in the batch for this session.
