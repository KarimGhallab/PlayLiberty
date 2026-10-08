# 09: The skip setting end-to-end journey

**Blocked by:** [`07`](07-show-the-skip-setting-read-only.md).
**Status:** resolved

## Outcome

Landed as `e2e/tests/skip.spec.ts`, two tests. The first flips the switch off, reloads, flips it back on and
reloads, so both directions and persistence are proved through the browser. The second adds a video to one
playlist, adds the same video to a second playlist (which reuses the one track), turns the second playlist's
setting off, and asserts over the API that the shared track did not move; a video no playlist's source lists is
then added and its track takes the new default.

The one trap worth recording: the first draft used a video that a playlist's source already listed, so its track
was born from the sync before the setting changed and the manual add reused it. A new track needs a video no
source lists.

Two things the fake cannot prove and the journey does not attempt: the actual trimming, because the E2E fake
copies the same file whatever the flag is, and the read-collaborator view, because the dev proxy fixes one
browser identity. The first is pinned at the adapter argument level; the second at the web unit and server route
levels.

Verification: the E2E suite (23 tests) and the e2e typecheck pass. No em dashes. Not committed.
