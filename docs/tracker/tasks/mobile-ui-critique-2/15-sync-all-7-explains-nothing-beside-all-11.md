# 15: "Sync all 7" explains nothing beside "All 11"

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)
**Blocked by:** None. Can start immediately.

## Observed

The dial offers "Sync all 7 playlists" while the scope above it reads "All 11". Both numbers are correct: the seven are
the playlists the account can write to. Nothing says what the difference is, so the bulk sync looks like it is skipping
four playlists for no reason.

## Expected

The row says why its count differs, in the same register as the ownership marks: the four read-only playlists are not
its to sync.

## Evidence

- `apps/mobile/src/views/library/bulkSync/bulkSync.ts:73-82`.
- Screenshot `a-lib-dial.png`.

## Acceptance criteria

- [x] The bulk-sync row explains its count, or drops the count and names the set.
- [x] The explanation is one line and fits the dial at 1.3.
- [x] Both catalogs carry it.
- [x] An account that can write to every playlist sees no redundant explanation.

## Verification

Open the dial with a scope that includes read-only playlists and read the row; then with a fully writable account.
Then `pnpm --filter @playliberty/mobile test`.

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

Checks: mobile typecheck and suite pass. The root build, lint and unit run follows in the batch for this session.
