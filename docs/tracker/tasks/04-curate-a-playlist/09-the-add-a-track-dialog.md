# The add-a-track dialog

**Objective:** Build the dialog that adds one pasted video to the chosen writable playlists in one batch
request, and keeps itself open to name the playlists that refused.

**Blocked by:** [`08`](08-the-add-a-track-control.md).

**Scope**

- `useAddTrack` in `shared/api/queries.ts`: `POST /tracks` with `{ url, playlistIds }`, parsed with
  `AddTrackResultSchema`, returning `AddTrackResult` rather than a void so the dialog's refusal state can be
  built from it, and invalidating the library and the playlist reads on success.
- `AddTrackDialog` in `shared/components/`, over the shared `Dialog` shell: a video URL field, a checklist of
  the writable playlists with the current one preselected, and the two verbs. The client refuses a playlist
  URL in the field before the request, the client's half of the server's own `422`.
- The refusal state: the dialog closes on an all-success batch, where there is nothing to read, and stays open
  on any `refused`, naming the refused playlists by name and claiming no cause, because the route withholds it
  on purpose so the batch cannot enumerate other accounts' playlists.
- The design record: [`add-track-dialog.md`](../../../design-system/components/add-track-dialog.md) and its
  specimen, `docs/design/components/add-track-dialog.html`, in both arrangements.

**Outcome**

Landed. The dialog is one request for the whole batch, the current playlist arrives checked, and the three
cases are distinguished: all-success closes, a mix says "Added to the rest. Not added to:" and names the
refusals, and an all-refused batch says "Nothing was added. Not added to:". The "every refused" sentence is
decided from the batch's own size, not the checkboxes on screen, which can have changed since the request.

**Verification**

- `AddTrackDialog.test.tsx`: the preselection, the one-batch submit, the playlist-URL refusal, the two refusal
  sentences, the silent all-success case, and axe.
- `PlaylistDetailPage.test.tsx`: the request carries the chosen ids, a mixed batch keeps the dialog open and
  names the refusal, and an all-success batch closes it.
- `pnpm run build`, `pnpm run lint`, `pnpm run design:check` and the web suite pass.
