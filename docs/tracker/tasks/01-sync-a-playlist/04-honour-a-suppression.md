# 04: Honour a removed track

**What to build:** A track the listener removed stays removed. The reconcile skips any video the playlist has
a suppression for, so it is not re-added on the next sync, and a video that returns to the source after its
suppression is gone is associated again. This ticket only reads suppressions; the write that creates one is
removing a track from a playlist, which spec 04 owns.

**Blocked by:** 02.

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A video id with a suppression for the playlist creates no association on the next sync.
- [x] A suppressed video that returns to the source after its suppression is removed is associated again.
- [x] The reconcile reads suppressions and never writes one. (Superseded in part by [`04/07`](../04-curate-a-playlist/07-a-returned-video-is-treated-as-new.md): the reconcile now lifts the suppression of a video the source no longer lists.)

## Outcome

Implemented and verified. The reconcile checks each source video for a suppression on the playlist before it
does anything else, so a suppressed video creates no track and no association at all. Lifting the suppression
lets the next sync associate the video again. The check is a single lookup against the suppression primary key.

The reconcile never writes a suppression. The tests assert both directions: the seeded row count is unchanged
after a sync, and syncs on a playlist with no suppressions leave none behind. The writer is removing a track
(spec 04, still unimplemented), so the tests seed and lift suppressions directly, which is the only way to put
the database in the state that ticket describes.

Superseded in part by ticket 07 of [`04-curate-a-playlist`](../04-curate-a-playlist/07-a-returned-video-is-treated-as-new.md),
which gives the reconcile one write: it now lifts the suppression of a video the source no longer lists, so a
removal does not outlive the video and a video that returns is associated again. The reconcile still creates no
suppression, and a suppressed video the source still lists stays removed. The test named "never writes a
suppression of its own" was renamed to "creates no suppression of its own" to say what is still true.

Verification: `pnpm run test` (79 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass.
