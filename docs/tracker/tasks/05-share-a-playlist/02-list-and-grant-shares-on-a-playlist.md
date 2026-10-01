# 02: List and grant shares on a playlist

**What to build:** An owner shares a playlist with someone in the household, and can see who has it.
`GET /playlists/:id/shares` answers the playlist's shares, each carrying the account, the level and when it was
created, to the owner alone. `POST /playlists/:id/shares` grants an account read or write. Granting to an
account that already has one changes that share's level rather than creating a second, which the unique
constraint on playlist and account makes well defined. Granting to yourself is refused, because it would be a
second path to access the owner already has; a target account that does not exist is refused, so a mistyped
choice is not lost silently; and a playlist the caller does not own, or one that does not exist, is the same
`404` every route in this feature gives. A grant takes effect at once: the target's library shows the playlist
at the level it was granted.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] The owner lists the playlist's shares, each with the account, the level and the created time.
- [ ] A read collaborator, a write collaborator and a stranger are each refused both routes with `404`.
- [ ] Granting read to an account makes the playlist appear in that account's library with read access.
- [ ] Granting write to an account that already holds read changes the level on the one share and produces one share, not two.
- [ ] Granting a share to the account that owns the playlist is refused.
- [ ] Granting a share to an account that does not exist is refused.
- [ ] A playlist that is not the caller's, and one that does not exist, both answer `404`.
- [ ] The mutating routes are refused without the client header.
