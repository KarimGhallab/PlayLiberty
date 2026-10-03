# E2E: what is not covered yet

The E2E suite in `e2e/` covers the journeys that exist on both sides today. Every
other critical journey is deferred until its client surface exists, because an E2E
test drives a browser and there is nothing to drive yet.

This file is the tracker for that gap. Move a journey into `e2e/tests/` when its
blocker lands, and delete its row.

| Journey                                                    | Blocked by                         | Why it cannot run                                                                                                                                                          |
| ---------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read a playlist's tracks                                   | spec 07 ticket 04 (the track list) | The playlist detail has no track list; there is no route to the screen.                                                                                                    |
| Curate: add a video, rename, delete, remove a track, retry | spec 04's client tickets (not cut) | The routes exist and are tested at the API; the dialog and overflow menu that call them do not.                                                                            |
| Share: grant and revoke                                    | spec 05's client tickets (not cut) | The routes exist; the share dialog does not.                                                                                                                               |
| Play stored audio                                          | all of spec 07                     | There is no player, queue or audio element.                                                                                                                                |
| Keep the screens current                                   | spec 09                            | There is no refresh loop to observe.                                                                                                                                       |
| Store and fetch tracks, user-visibly                       | spec 07 ticket 04                  | The stored state is real and the stream serves it, but no screen shows a track's status yet.                                                                               |
| Names a shared item's owner                                | spec 05's share dialog             | The dev proxy fixes one identity, so a share between two accounts cannot be set up through the browser. The owner line itself is unit-tested in `PlaylistHeader.test.tsx`. |
| A second sync changes nothing                              | a sync control in a client         | Idempotence is tested at the API; the UI has no sync control.                                                                                                              |

## Conventions

- One spec file per journey family, in `e2e/tests/`, named `<area>.spec.ts`.
- A test resets the instance through the test-only `POST /api/v1/__e2e__/reset`
  route, mounted only when `NODE_ENV=test`, and chooses the fake adapter's answer
  through `e2e/.scenario.json`.
- Run with `pnpm run e2e`. It is separate from `pnpm run test`, which stays unit
  only, per the testing guideline.
