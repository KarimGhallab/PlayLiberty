# 01: One actions sheet on both surfaces

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The shared actions model now takes an `includePin` option. The gallery keeps the pin; the detail leaves it off,
because [`28`](../../specs/28-pin-a-playlist.md) gives the detail no pin control. The detail's overflow is drawn for
the owner and a write collaborator, and not for a read collaborator.

The owner's detail sheet holds Share, Rename, Cover, Sync now and Delete. A write collaborator's holds Cover and
Sync now. Sync now calls the playlist's sync route and closes the sheet on success. A refused Pin or Sync now leaves
the sheet open with the problem's mapped sentence; the fallback is `library.syncFailed` or `library.pinFailed`. The
gallery keeps the owner's six items, the writer's Pin, Cover and Sync now, and the reader's Pin alone, and now uses
the same refusal contract.

Share, Rename and Cover open the existing placeholder on both screens. [`02`](02-rename-a-playlist.md) replaces
Rename; [`26`](../../specs/26-share-a-playlist.md) and [`29`](../../specs/29-set-a-playlist-cover.md) replace Share
and Cover. The new sentence is in both catalogs under `library.syncFailed`.

## Verification

- Mobile 382 tests across 43 suites pass, including the new model, detail and gallery cases.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, in French, the detail as the owner showed Share, Rename, Cover, Sync now and Delete, with no Pin;
  as a write collaborator it showed Cover and Sync now; as a read collaborator it showed no overflow.
- Sync now from the detail started the sync and closed the sheet; the identity read `Synchronisation`.
- The gallery showed six items for the owner, Pin, Cover and Sync now for the writer, and Pin alone for the reader.
- Airplane mode forced a refused Pin and a refused Sync now; each kept the sheet open with
  `L'épingle n'a pas pu être modifiée.` and `La synchronisation n'a pas pu démarrer.`

See [`25-curate-a-playlist`](../../specs/25-curate-a-playlist.md).
