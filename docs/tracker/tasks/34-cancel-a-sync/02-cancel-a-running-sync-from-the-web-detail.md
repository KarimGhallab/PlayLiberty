# 02: Cancel a running sync from the web detail

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`SyncRunStatus` gained `cancelled` and `DELETE /api/v1/playlists/:playlistId/sync` was added. `cancelSyncForPlaylist` commits the run as cancelled with `finishedAt` and a null error, returns the playlist to idle and announces `PlaylistChanged` only on a transition. The reconcile now checks the run after the source read, first inside the final transaction and in its catch path, so a late success or failure cannot overwrite the cancel and no association, track or download is written. The shared client gained `cancelSyncPlaylistOptions` and `useCancelSyncPlaylist`, invalidating the playlist prefix and the library.

The web run band owns the only Cancel control, names the playlist, exposes busy and disabled, and shows the neutral "Sync cancelled" stamp without counts or retry. The detail page owns the failure notice and disables the header sync and the menu's Sync now while the run is running. The mobile run band renders the same cancelled stamp neutrally; its control is ticket 03. Server tests cover the command, the checkpoints, access, the event and untouched tracks; web tests cover the control, notices, invalidation and gallery regrouping; the mobile run-band test covers the cancelled presentation.

See [`34-cancel-a-sync`](../../specs/34-cancel-a-sync.md).
