# 03: Add a playlist from the gallery

**Status:** resolved

## Outcome

`AddPlaylistDialog.tsx` under `src/views/library/` is the `400px` card on `--surface-raised` with the one `Playlist link` field, `Cancel` and `Add`; both the header's control and the gallery's action open it, and on success it closes and the person stays on the library. The client's `apiPost` sends a JSON body through `send` so the `X-PlayLiberty-Client` header is attached by the same code every mutation goes through, and `useCreatePlaylist` posts the URL, invalidates `['playlists']` on success, and writes no optimistic row because the route answers `202` with a `SyncRun` rather than the playlist. The client refuses empty and malformed URLs with `CreatePlaylistInputSchema.safeParse` before the mutation, and the server's `400 invalid_request` `detail` is what the field shows, cleared as the person types. The dialog fades in and out over `--motion-base` on `--ease-standard` (the scrim by opacity, the card by opacity and a 98% to 100% scale), its exit names its own keyframes rather than reversing the entrance, and a timer at the same duration handed in as `--dialog-motion` unmounts the node, with a reduced-motion reader skipping the wait.

See [`08-see-the-library`](../../specs/08-see-the-library.md).
