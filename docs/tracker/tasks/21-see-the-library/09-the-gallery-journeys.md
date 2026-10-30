# 09: The gallery journeys

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md), [`05`](05-the-add-sheet.md), [`07`](07-the-cards-actions.md)

## Outcome

Three Maestro flows now cover the gallery's critical journeys: `gallery-card` opens a card's playlist, `gallery-add` adds a playlist from the floating action, and `gallery-pin` pins one from its card. Each flow stops and launches the app, signs in through the existing browser fallback when the app is signed out, and leaves the device in the library. The add flow takes its link from `SOURCE_URL`.

The flows needed stable seams: the detail route carries `playlist-screen`, the Pinned and Syncing headings carry `gallery-heading-pinned` and `gallery-heading-syncing`, and a card's overflow carries a group-qualified id so the pin flow targets an unpinned, idle card in the rest group regardless of the account's existing pins.

The add flow exposed the server's first reconcile finishing before the gallery read, so the new playlist arrived idle. `useCreatePlaylist` now inserts the created playlist into the library as syncing and the gallery holds that flag for six seconds; the next read replaces it. The new playlist is therefore visible under the Syncing heading on the press, including when the source is already in the account's library.

## Verification

- All seven flows pass on the emulator: 7/7 in 3m 42s, including the three gallery journeys.
- Mobile 164 tests across 27 suites pass; `typecheck`, `lint:check` and `build` pass.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
