# 26: A source entry id that is not a video id never reaches the filesystem

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Outcome

Done. A non-video entry id is rejected at the adapter boundary, and the media path builders refuse a path that would escape.

- `validateYoutubeUrl` now exports `isValidVideoId` (the existing video-id pattern), and the adapter's `toEntry` rejects any entry whose id fails it, so a bad id is never stored.
- `mediaRelativePath` and `thumbnailRelativePath` build through one helper that resolves the path against its directory and refuses it unless `isSubPath` holds, compared against the directory plus a separator so a sibling whose name merely starts with it is not mistaken for a child. This is the second layer behind the adapter.
- Tests cover a traversal-shaped id at both layers, and a valid id at both.

Verification: youtube suite 31 tests (2 new), server media paths 4 tests (new); full unit suite exits 0 (tokens 3, youtube 31, i18n 39, ui-foundation 6, server 309, web 372); `pnpm run build` and `pnpm run lint` clean.
