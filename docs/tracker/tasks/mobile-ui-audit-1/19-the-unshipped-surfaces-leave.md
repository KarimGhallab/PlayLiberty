# 19: The unshipped surfaces leave

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

`docs/DESIGN.md` says "The queue is a sheet above it", and the app has an empty `QueueSheet` directory. The ticket that
would have built it is `wontfix`: the track list is the queue. A prototype route for notice variants also ships in the
app, with its own "throwaway chrome" switcher and English-only labels outside the i18n table.

## Expected

The design document describes what ships, the dead directory is gone, and no prototype route is reachable in the app.

## Evidence

- `docs/DESIGN.md`, the mobile client section.
- `apps/mobile/src/player/QueueSheet/`: empty.
- `docs/tracker/tasks/23-play-stored-audio/04-the-queue-is-a-sheet-above-the-bar.md`: `wontfix`.
- `apps/mobile/app/prototype/notice.tsx` and `apps/mobile/src/views/prototype/`.

## Acceptance criteria

- [x] DESIGN.md names the track list as the queue and no longer promises a sheet.
- [x] The empty `QueueSheet` directory is deleted.
- [x] The prototype route, its view and its switcher are removed.
- [x] No remaining reference to either surface exists in the app.

## Outcome

`docs/DESIGN.md` now says the track list is the queue and the bar is the transport above it; the sheet promise is
gone. The empty `QueueSheet` directory, the `app/prototype/notice` route, its `NoticePrototype` view and the
`PrototypeSwitcher` are deleted. A stale issue 78 note that named the switcher was reworded.

`rg "QueueSheet|prototype/notice|PrototypeSwitcher" apps/mobile docs` returns only this ticket's record. The suites,
typecheck, lint and build pass.

## Verification

`rg "QueueSheet|prototype/notice|PrototypeSwitcher" apps/mobile docs` returns only the resolved ticket's own record.
`pnpm --filter @playliberty/mobile run test`, `pnpm --filter @playliberty/mobile run typecheck`,
`pnpm run lint:check` and `pnpm run build` pass.
