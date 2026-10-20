# 01: Freeze the skip-non-music setting on a playlist

**Status:** resolved

## Outcome

`playlist.skip_non_music` is a boolean column, not null, defaulting to true (migration `0005_easy_ezekiel`). `CreatePlaylistInputSchema` gains `skipNonMusic` with a default of true, so the field stays optional on the wire and an old client that sends only a URL still gets the behaviour, and `PlaylistSchema` gains a required `skipNonMusic`. `startSyncForSource` writes the value on the insert only, so a re-paste of the same source keeps the first paste's value, and the update route writes the name and the timestamp and nothing else, so the setting cannot be changed after creation. `toPlaylistView` is the one place the column becomes the contract field.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
