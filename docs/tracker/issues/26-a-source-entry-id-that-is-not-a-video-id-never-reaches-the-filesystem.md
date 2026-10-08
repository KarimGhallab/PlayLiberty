# 26: A source entry id that is not a video id never reaches the filesystem

**State:** `resolved`
**Category:** `bug`
**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** An entry id from yt-dlp is accepted as any non-empty string and then interpolated into media paths, so an id shaped like a traversal escapes the media root at write and delete time.

**Current behavior:**
`toEntry` checks only that `value.id` is a non-empty string. The id becomes `media/<id.slice(0,2)>/<id>.m4a` through `mediaRelativePath`, is written by the download worker, and is later removed by the prune. `slice(0,2)` of a `..`-prefixed id resolves outside the root. The manual-add path validates the video id against a pattern; the adapter path does not.

**Desired behavior:**
An entry whose id fails the video-id pattern is rejected at the adapter boundary, before it is stored or used in a path. The media path builders assert the resolved path stays under the media root, as a second layer, using the unused `isSubPath` helper in `packages/utils`.

**Key interfaces:**

- `toEntry` in `packages/youtube`, where the id is accepted.
- `mediaRelativePath` and `thumbnailRelativePath` in the server's media paths.
- `isSubPath` in `packages/utils`, currently unused.

**Acceptance criteria:**

- [x] An entry id that is not a valid video id makes the adapter reject the source rather than return it.
- [x] The media path builders refuse a value that would resolve outside the media root.
- [x] Tests cover a traversal-shaped id at both layers.
- [x] A valid id is unaffected.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The thumbnail host policy, which is issue 25.
- Re-validating ids at every layer once the adapter and the path builder both enforce it.

## Outcome

Done. A non-video entry id is rejected at the adapter boundary, and the media path builders refuse a path that would escape.

- `validateYoutubeUrl` now exports `isValidVideoId` (the existing video-id pattern), and the adapter's `toEntry` rejects any entry whose id fails it, so a bad id is never stored.
- `mediaRelativePath` and `thumbnailRelativePath` build through one helper that resolves the path against its directory and refuses it unless `isSubPath` holds, compared against the directory plus a separator so a sibling whose name merely starts with it is not mistaken for a child. This is the second layer behind the adapter.
- Tests cover a traversal-shaped id at both layers, and a valid id at both.

Verification: youtube suite 31 tests (2 new), server media paths 4 tests (new); full unit suite exits 0 (tokens 3, youtube 31, i18n 39, ui-foundation 6, server 309, web 372); `pnpm run build` and `pnpm run lint` clean.

## Evidence

- `packages/youtube/src/ytdlp/ytdlp.ts:176-191`.
- `apps/server/src/platform/media/mediaPaths.ts:33-38`.
- `apps/server/src/features/downloads/worker/downloadWorker.ts:178-195`.
- `apps/server/src/features/prune/service/pruneService.ts:98-109`.
- `packages/utils/src/utils/pathUtils.ts:64` (`isSubPath`).
- Security review 2026-10-08, finding 5.
