# 04: Move the optimistic patch into the query package

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`03`](03-share-one-data-module-for-the-reads-and-commands.md).

## Observed

Web has one optimistic patch module of 35 lines, used by two mutations. Mobile writes the same four steps by hand in the pin, the skip-non-music switch and the sort mutation. The library page patcher exists once per client shape.

A refused write restores the snapshot on web through one helper. On mobile the restore is part of each mutation body, so a new optimistic mutation can omit it.

## Expected

`@playliberty/query` owns the patch, the restore and the library page patchers, beside the keys and the cache effects. The pin, the skip switch and the sort call it on both clients. One helper patches every loaded library page.

## Evidence

- Web patch: `apps/web/src/shared/api/optimisticPatch/optimisticPatch.ts`, 35 lines.
- Mobile inline copies: `useUpdatePin.ts` (54), `useUpdateSkipNonMusic.ts` (50), `useUpdateSort.ts` (50).
- Mobile page patchers: `apps/mobile/src/api/playlistCache.ts`, 73 lines.
- Web patches one `PlaylistPage`. Mobile patches every page. After ticket 03 both hold pages.

## Acceptance criteria

- [ ] `query` exports the patch, the restore, the optimistic context and the page patchers, with tests.
- [ ] The pin, the skip switch and the sort call the shared patch on both clients.
- [ ] No mutation cancels, snapshots or restores by hand.
- [ ] A refused write restores every loaded library page.
- [ ] An absent read stays absent, and the patch does not create one.

## Verification

The package suite proves the cancel, the snapshot, the apply and the restore. It also proves that a pin patches every page and that an absent read stays absent. `pnpm --filter @playliberty/web test` and `pnpm --filter @playliberty/mobile test` pass. `pnpm run build` and `pnpm run lint:check` pass.
