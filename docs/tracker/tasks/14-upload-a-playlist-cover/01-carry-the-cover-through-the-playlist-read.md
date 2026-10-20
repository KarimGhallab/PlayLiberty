# 01: Carry the cover through the playlist read

**Status:** resolved

## Outcome

The playlist row now carries nullable `cover_path` and `cover_updated_at` columns through migration
`0003_absent_deathstrike`, and the contract's `PlaylistSchema` carries nullable `coverUpdatedAt`.
`toPlaylistView` copies the row value, so the detail read, the page read and every mutation answer carry `null`
until a cover exists. The server test fixtures gained cover seed options, and every web playlist fixture and mock
gained the field, so the read shape compiles everywhere before the feature starts. `coverTrackId` and every
other playlist field are unchanged; no screen or API behavior changed.

Route tests assert `coverUpdatedAt` is null on the detail, the page and a rename answer. The migration test
asserts both new columns. The full build, the unit suites (server 350, web 497) and lint pass; lint reports only
the existing unused `CONTROL` warning in the phone journey.

See [`14-upload-a-playlist-cover`](../../specs/14-upload-a-playlist-cover.md).
