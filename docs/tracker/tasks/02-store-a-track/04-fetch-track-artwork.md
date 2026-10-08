# 04: Fetch a track's artwork with its audio

**Blocked by:** 01.
**Status:** resolved

## Outcome

Implemented and verified. A track now remembers the source thumbnail URL the sync read for it (new nullable
`thumbnail_url` column, migration `0004`), and the adapter gains `fetchThumbnail`, so the image fetch stays
behind the same seam as the audio rather than reaching the CDN from the worker. The sync stores the URL only
on a track it creates; an existing track keeps its metadata.

After the worker stores the audio it fetches the image, best effort: on success it records `thumbnailPath`,
and a thumbnail that fails logs a warning and leaves the path null while the track stays `stored`. The picture
is fetched only on the success path, so a failed or gone download never leaves artwork without a track.

Verification: `pnpm run test` (103 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
