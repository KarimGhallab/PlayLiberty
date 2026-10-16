# 01: The pin on a playlist

**Blocked by:** None. Can start immediately.
**Status:** resolved

## Outcome

Implemented and verified. The schema gains `playlist_pin`, keyed on `(account_id, playlist_id)`, both foreign
keys cascading, holding `pinned_at` and neither an update timestamp nor a position column, with
`playlist_pin_account_idx` on `(account_id, pinned_at)` for the section's order (migration
`0002_fair_barracuda`, generated from the schema).

The contract gains two things. `PlaylistSchema` carries a required `pinned`, so every read and every mutation's
answer carries the flag, and `PinPlaylistInputSchema` is the required boolean body. `toPlaylistView` is the one
place the row's presence becomes the contract field.

The read: `listPlaylistsForAccount` left-joins the account's own pin and orders pinned first by `pinned_at`
descending, then `created_at` and the playlist rowid as before, so the pins are lifted out and the rest keep
the order they had; the total is unchanged because a pin moves a row within the page. `readPlaylist` answers
the flag through one lookup, so the single read and every mutation agree.

The write: `PATCH /playlists/:id/pin` mirrors the skip route, resolving the playlist through the entry seam at
the read requirement, validating the body, answering the updated playlist, and publishing nothing. The handler
writes only the pin table, never the playlist.

The fixtures: `playlistPins` and `seedPin(accountId, playlistId, { pinnedAt })` in the server's fixture module.
The web fixtures that build a `Playlist` literal gained `pinned: false`, because the contract field is required.

The tests: the route suite gains the ordering-and-flag case, paging across the two groups, the pin, pin-again
and unpin cases, a read collaborator pinning and unpinning, the two-account case, the cascade on delete, the
revoke-and-regrant case, the 404s in both directions, and the validation and client-header refusals.
`liveEvents.test.ts` gains the no-event case, and `migrate.test.ts` gains the new table with its stale
single-migration comment corrected.

Verification: `pnpm test:unit` (server 373, web 459, i18n 39, youtube 31, ui-foundation 6, tokens 3),
`pnpm run build`, `pnpm run lint`, prettier and the e2e typecheck pass. Not committed.
