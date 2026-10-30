# 06: The bulk sync

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`02`](02-the-gallery-draws-the-playlists.md), [`04`](04-the-scope-and-the-status-chips.md)

## Outcome

The library screen now composes the header and the gallery, so the bulk sync and the rail share one state. `LibraryScreen` owns the scope and status chip and reads the gallery through `usePlaylists`; `PlaylistGallery` takes those filters as controlled props, and the selection rules have one owner in `bulkSync.ts`.

The header's bulk sync names its count through `library.syncAll`, counts the visible scope and chip narrowed to writable, idle playlists, and is absent at zero. It is a full-sentence bordered button on the title's line, before the account avatar; the title drops to `text-md`, and an admin's egress door becomes a compact icon, so the full count survives at 390.

`useSyncAllPlaylists` freezes the set at the press and starts one sync per playlist, one at a time. A `409 SyncAlreadyRunning` is counted and the loop continues; any other refusal stops it and keeps the tally so far. The loop invalidates the gallery once when it settles.

The busy state holds while the loop runs, while any playlist of the frozen batch still reads syncing, and until a gallery read taken after the press lands. While busy the control keeps the frozen count, shows `library.syncingAll` with a spinner, and refuses the press.

The tally maps to `Notice`, the app's first notice surface: a raised transient message over the screen, `pointerEvents="none"`, withdrawn by its own timer. Its text names what started and what was already running, or the refusal that stopped the loop.

## Verification

- Mobile 139 tests across 24 suites, including the bulk sync's 10, the sync loop's 2 and the notice's 2.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
