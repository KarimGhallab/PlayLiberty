# 09: The skip setting end-to-end journey

**Status:** resolved

## Outcome

Landed as `e2e/tests/skip.spec.ts`, two tests. The first flips the switch off, reloads, flips it back on and reloads, proving both directions and persistence through the browser. The second adds a video to one playlist, adds the same video to a second playlist (which reuses the one track), turns the second playlist's setting off, asserts over the API that the shared track did not move, then adds a video no playlist's source lists and asserts its track takes the new default. The fake cannot prove the actual trimming, because it copies the same file whatever the flag is, nor the read-collaborator view, because the dev proxy fixes one browser identity; the first is pinned at the adapter argument level and the second at the web unit and server route levels.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
