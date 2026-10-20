# 01: The pin on a playlist

**Status:** resolved

## Outcome

The schema gains `playlist_pin`, keyed on `(account_id, playlist_id)`, both foreign keys cascading, holding `pinned_at` and neither an update timestamp nor a position column, with `playlist_pin_account_idx` on `(account_id, pinned_at)` for the section's order (migration `0002_fair_barracuda`, generated from the schema). `PlaylistSchema` carries a required `pinned`, so every read and every mutation's answer carries the flag, `PinPlaylistInputSchema` is the required boolean body, and `toPlaylistView` is the one place the row's presence becomes the contract field. The read: `listPlaylistsForAccount` left-joins the account's own pin and orders pinned first by `pinned_at` descending, then `created_at` and the playlist rowid as before, so the pins are lifted out and the rest keep the order they had, with the total unchanged because a pin moves a row within the page, and `readPlaylist` answers the flag through one lookup so the single read and every mutation agree. The write: `PATCH /playlists/:id/pin` mirrors the skip route, resolving the playlist through the entry seam at the read requirement, validating the body, answering the updated playlist, and publishing nothing, and the handler writes only the pin table, never the playlist.

See [`13-pin-a-playlist`](../../specs/13-pin-a-playlist.md).
