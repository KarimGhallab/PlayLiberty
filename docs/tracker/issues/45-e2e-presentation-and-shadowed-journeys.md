# 45: e2e presentation and fully-shadowed journeys

**State:** `resolved`
**Category:** `enhancement`

## Outcome

The e2e suite carries journeys, not presentation. Cut two fully-shadowed journeys (`library.spec.ts` empty gallery, `curate.spec.ts` press-opens-playlist) and trimmed the component-owned presentation assertions: the sync failure-band sentences and the `Sync now` presence, the two track-count texts, the `Up to date` state, the add-dialog checkbox preselection, and the post-revoke `Private playlist` indicator. The shuffle specs now scope with `getByRole('listitem')` and identify the sounding row by the accessible `Playing` image, keeping the claim without the `data-state` coupling. Kept the pre-reload `Shared playlist` indicator, a deviation from the manifest because it synchronizes the grant's persistence before the reload and cutting it would race the reload, plus the dialog-presence waits in `curate`, `library` and `skip`, the `sync.spec.ts` raw-reason reveal, and the negative `No playlists yet` baselines in `live.spec.ts`.
