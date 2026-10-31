# 04: The row's lane and sheet

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-the-track-rows-draw-and-play.md), and the human install of `expo-clipboard`

## Outcome

Every row now carries a lane that opens one bottom sheet for its track. The sheet holds Copy link, and for a failed
track a write collaborator also gets Retry and Fetch whole. Fetch whole appears only while the playlist's skip setting
is on. A row whose mutating action is in flight keeps Copy link and drops the two repairs. A read collaborator sees
Copy link alone.

Copy link builds the absolute detail address from the configured origin with the track parameter, copies it through a
lazy `copyText` module, and confirms or explains the refusal in a notice. The lazy import keeps the detail loading on a
dev client built before `expo-clipboard`; Copy reports the refusal there until the dev client is rebuilt.

Retry and Fetch whole call the track routes through their own mutations, invalidate the playlist reads, and close the
sheet. A refused action is the problem's sentence in a notice beside the track title. The sheet closes on the
backdrop, the handle and a chosen item, and its items render in French.

## Verification

- Track sheet model 5 tests, sheet 4 tests, row 8 tests and detail 30 tests pass.
- Mobile 211 tests across 31 suites pass.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, the lane opened the sheet for a stored track and showed Copy link. The dev client must be rebuilt
  for the native clipboard module before Copy can be exercised on the device.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
