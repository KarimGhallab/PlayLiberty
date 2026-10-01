# 06: Paste a single video URL

**What to build:** A listener pastes a single video URL and gets a one-track Synced playlist whose source is
that video, with one remote association, named and covered from the video. It syncs and re-syncs like any
other playlist. This is distinct from adding a video to playlists that already exist, which spec 04 owns.

**Blocked by:** 01.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A single video URL creates a Synced playlist whose source is that video, with one remote association.
- [x] The playlist's name and cover come from the video.
- [x] Re-posting the same video URL returns the existing playlist rather than creating a second.

## Outcome

Verified, with no production change. The create path from ticket 01 already accepts a video URL: the URL
validator returns a video source for a watch or youtu.be link, and the reconcile reads whatever the stored
source URL points at, so a video source produces a one-entry reading and one remote association. The playlist
takes its source id from the video id, its name from the video's title and its cover from the video's
thumbnail, and the per-owner source uniqueness makes a re-post return the same playlist.

Three tests pin it: a video URL creates a one-track playlist with one remote association at position 0, named
and covered from the video; a re-post returns the same playlist id and leaves one playlist for the owner; and
the resulting playlist re-syncs like any other, adding nothing on a second pass.

Verification: `pnpm run test` (85 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
