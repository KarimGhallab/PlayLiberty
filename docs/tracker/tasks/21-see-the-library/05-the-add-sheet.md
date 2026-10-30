# 05: The add sheet

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-one-sheet-frame-for-the-app.md), [`03`](03-the-gallery-states.md)

## Outcome

The gallery now draws the floating round add action over a gallery with items, and no floating action when the gallery is empty; the empty gallery's own labelled action opens the same sheet. Both controls open `AddPlaylistSheet`, which uses the shared `Sheet` frame.

The sheet owns the playlist link field, the skip-non-music checkbox defaulting on, Cancel and Add, the busy label with its spinner, the schema refusal, the server refusal and the discard confirmation. Add is disabled while busy or while the field is empty. A malformed link is refused by `CreatePlaylistInputSchema` before any request. A typed link asks before it is discarded, through Cancel, the backdrop, a drag or the back request. A fresh open resets the link and the checkbox.

`useCreatePlaylist` posts the link and the setting, inserts the created playlist into the library as syncing, and the gallery holds that flag for six seconds while the server's quick first reconcile settles; the next read replaces it with the server's row. The gallery closes the sheet and resets the mutation when the create succeeds.

The gallery's tests cover the floating action's presence and absence, the empty gallery's action opening the sheet, and the sheet closing on success. The add sheet's own tests cover the schema refusal, the busy state, the discard confirmation and the skip default. The skip control is the shared `Checkbox`, whose own tests cover the announced state, the toggle, the hint and the disabled refusal.

## Verification

- Mobile 119 tests across 20 suites, including the add sheet's 7, the gallery's 16 and the checkbox's 3.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run build` and `pnpm run lint:check` pass.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
