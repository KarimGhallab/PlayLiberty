# 01: The list and the item

**Status:** resolved

## Outcome

`PlaylistHeader` is the new shared component under `src/shared/components/`, drawn inside a `<li>` per playlist, and renders the cover, the name, the share indicator, the sync line and the count, with the actions column (play, shuffle, overflow) deliberately absent. The cover and the name are both `Link`s to `/playlists/$playlistId`, the cover with `aria-hidden` and `tabindex="-1"`, so exactly one link is announced per item. The share indicator is one glyph from three states, `own-private` (lock), `own-shared` (lock-share) and `collab` (user-share), chosen from `access` and `hasShares`, and its tooltip is a `role="presentation"` child so the sentence is not announced twice. The sync state word moved into `ui-foundation` as `syncStateLabel`, beside `formatLastSynced` and `formatTrackCount`, and the count is drawn as a separate number and unit through `trackCountUnit`; a never-synced playlist reads `Up to date` for its state and `Never synced` for its time.

See [`08-see-the-library`](../../specs/08-see-the-library.md).
