# 01: Freeze the skip-non-music setting on a playlist

**What to build:** Creating a playlist records whether the playlist skips the non-music parts of its videos. The
option is on by default and is chosen when the playlist is added. The chosen value is stored on the playlist,
returned on every playlist read, and never changed by the update route. The setting is frozen at creation,
because a stored file is shared and cannot be re-cut for one playlist later: an editable toggle would be a
setting that lies.

**Blocked by:** None. Can start immediately.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A playlist created without the option is stored with the setting on, and one created with it off stores off.
- [ ] The value is returned on the playlist read, for one playlist and for the library list.
- [ ] The update route changes the name only and never the setting.
- [ ] The create route is the only writer of the value.

**Verification:** the server route tests over a temporary database, `pnpm run build` and `pnpm run lint`.
