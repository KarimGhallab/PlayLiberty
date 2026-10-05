# 01: Freeze the skip-non-music setting on a playlist

**What to build:** Creating a playlist records whether the playlist skips the non-music parts of its videos. The
option is on by default and is chosen when the playlist is added. The chosen value is stored on the playlist,
returned on every playlist read, and never changed by the update route. The setting is frozen at creation,
because a stored file is shared and cannot be re-cut for one playlist later: an editable toggle would be a
setting that lies.

**Blocked by:** None. Can start immediately.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A playlist created without the option is stored with the setting on, and one created with it off stores off.
- [x] The value is returned on the playlist read, for one playlist and for the library list.
- [x] The update route changes the name only and never the setting.
- [x] The create route is the only writer of the value.

**Verification:** the server route tests over a temporary database, `pnpm run build` and `pnpm run lint`.

## Outcome

Implemented and verified. `playlist.skip_non_music` is a boolean column, not null, defaulting to true
(migration `0005_easy_ezekiel`). `CreatePlaylistInputSchema` gains `skipNonMusic` with a default of true, so the
field stays optional on the wire and an old client that sends only a URL still gets the behaviour;
`PlaylistSchema` gains a required `skipNonMusic`, so every read carries it. `startSyncForSource` takes the value
and writes it on the insert only, so a re-paste of the same source keeps the first paste's value. The update
route writes the name and the timestamp and nothing else, so the setting cannot be changed after creation.

The tests: the create flow defaults to on and records off when asked, the same source pasted again keeps the
first value, and the read returns the value for one playlist and for the library list. The existing update test
now seeds the setting false and asserts it survives a rename, which is the "nothing else" case extended rather
than a new test. `toPlaylistView` is the one place the column becomes the contract field.

Two tests were added to `syncService.test.ts` and the create test there gained the default assertion; the
playlist route tests gained assertions in place. Web fixtures that build a `Playlist` literal gained
`skipNonMusic`, because the contract field is required.

Verification: `pnpm run test` (server 226 tests, web 262, e2e 21), `pnpm run build`, `pnpm run lint` and
`pnpm run design:check` pass. No em dashes. Not committed.
