# E2E: what is not covered yet

The E2E suite in `e2e/` covers the journeys that exist on both sides today. Every
other critical journey is deferred until its client surface exists, because an E2E
test drives a browser and there is nothing to drive yet.

This file is the tracker for that gap. Move a journey into `e2e/tests/` when its
blocker lands, and delete its row.

| Journey                          | Blocked by                                                                 | Why it cannot run                                                                                                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Curate: add a video to playlists | spec 04's add-a-video client ticket                                        | The route exists and is tested at the API, but the playlist detail has no dialog to paste a video into, so a browser has nothing to drive.                                           |
| Keep the screens current         | [`09-keep-the-screens-current`](../09-keep-the-screens-current/TICKETS.md) | The event stream does not exist yet, so a journey that reaches a new server state reads it again by reloading. The browser journeys for the stream land with the tickets.            |
| Names a shared item's owner      | not yet written                                                            | No test yet arranges a playlist another account owns. The account can be created over the API, as the share journey does, but no journey views that account's item from the browser. |

## Conventions

- One spec file per journey family, in `e2e/tests/`, named `<area>.spec.ts`.
- A test resets the instance through the test-only `POST /api/v1/__e2e__/reset`
  route, mounted only when `NODE_ENV=test`, and chooses the fake adapter's answer
  through `e2e/.scenario.json`.
- Run with `pnpm run test:e2e`. It is separate from `pnpm run test`, which stays
  unit only, per the testing guideline.
- A scenario that waits on the download worker calls `drainDownloads(page)`
  (`POST /api/v1/__e2e__/download`) rather than waiting on the clock. The worker
  claims `DOWNLOAD_CONCURRENCY` (two) tracks per pass on a 30-second interval, so
  without the drain a scenario of more than two stored tracks spends a whole
  interval waiting on a tick; the drain asks the worker to run until the backlog is
  empty and returns once the tracks are stored.

## Covered

| Journey                                  | Spec                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| Open the library and add a playlist      | [`library.spec.ts`](../../../../e2e/tests/library.spec.ts)   |
| Sync, curate, share                      | `sync.spec.ts`, `curate.spec.ts`, `share.spec.ts`            |
| Play a stored track and seek             | [`playback.spec.ts`](../../../../e2e/tests/playback.spec.ts) |
| Shuffle, walk it, unshuffle, press a row | [`shuffle.spec.ts`](../../../../e2e/tests/shuffle.spec.ts)   |
