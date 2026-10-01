# 07: A returned video is treated as new

**What to build:** A suppression is not permanent. On a sync, a suppressed video that the source still lists
stays removed, but a suppression whose video the source no longer lists is lifted, so if the video later comes
back it is associated again. Removing a track is then a choice about what is in the playlist now, not a
deletion of the video forever. This changes the reconcile from reading suppressions to reading and lifting
them, which overrides spec 01's ticket 04 criterion that the reconcile never writes one; that ticket's
behaviour for a video still in the source is unchanged, and it stays not re-added.

**Blocked by:** [`05`](05-remove-a-track-from-a-playlist.md).

**Status:** resolved

**Labels:** `enhancement`, `ready-for-agent`

- [x] A suppressed video the source still lists is not re-associated, and its suppression survives the sync.
- [x] A suppression whose video is absent from the source is lifted by the sync.
- [x] A video that left the source and returned after its suppression was lifted is associated again.
- [x] Removing a track and then syncing while the video is still present keeps it removed.

## Outcome

Implemented and verified. The reconcile now reads the source's present video ids once, lifts the playlist's
suppressions whose video is not among them, and reuses that set for the retention pass it already ran.
`liftAbsentSuppressions` reads the playlist's own suppressions and deletes the absent ones in one `in`
statement, so the work is bounded by the suppression count rather than by the size of the source. A suppressed
video the source still lists is left alone, so a removal stays in force while the video is present; an absent
one is lifted, so a video that returns is associated again.

This overrides spec 01 ticket 04's criterion that the reconcile never writes a suppression, and that ticket is
annotated. Its behaviour for a video still in the source is unchanged.

The three new tests cover the lift after a real removal through the association service, the leave-and-return
round trip that ends in a re-association, and a removal holding while the source still lists the video. The
stale assertion in spec 01's suite was renamed to "creates no suppression of its own", which is still true.

Before implementing, the user settled one scope question this ticket does not answer: a returned video is
associated but its track row is not un-marked. `sourceStatus` stays `removed` if a sync had seen it absent
while it was associated, and a track that is `unavailable` stays unavailable rather than being re-queued, so a
returned video can read as gone from the source and an unstored one is not re-fetched. That is deliberate for
now and is outside this ticket's promise of "associated again". A second accepted limitation: the lift needs a
sync to observe the absence, so a video that leaves and returns entirely between two syncs is never re-added.

Verification: `pnpm run test` (173 server tests, 3 new), `pnpm run build`, `pnpm run lint`, `npx depcruise .`,
`npx syncpack lint`, `node ./scripts/validate-tsconfig-paths.cjs` and `pnpm run design:check` pass. No
migration, no em dashes. Not committed.
