# 04: Treat a SponsorBlock failure as retryable, not a gone video

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md).
**Status:** resolved

## Outcome

Implemented and verified. `errors.ts` gains a second classification beside the gone-video one:
`isSponsorBlockFailureMessage` matches yt-dlp's two outage phrases (`Unable to communicate with SponsorBlock
API` and `SponsorBlock information is unavailable`), and `YoutubeSponsorBlockError` is the typed error. Its
message is `SPONSORBLOCK_FAILURE_REASON`, a fixed sentence with no video id, so the stored reason is the same
for every track. The package index exports the three names.

`downloadTrack` classifies after the unavailable check. The two pattern sets do not overlap, which is the
property that keeps an outage retryable; the classification test asserts it in both directions. The worker's
transient branch records `failed` with the typed error's fixed message rather than running it through
`summarizeFailure`, so the reason cannot drift with the tool's output, and it never reaches
`markTrackSourceRemoved`, so `sourceStatus` stays `available`.

The tests: four classification tests in a new `errors.test.ts` (both phrases recognised, a gone video not
misread, the sets not overlapping, and the fixed reason carrying no video id); a worker test that a
SponsorBlock failure leaves `failed` with the fixed reason and `available`, and is not retried on a later pass;
and a sync test that drives the failure through the worker, syncs again, finds the track back at `pending`, and
stores it on the next pass.

Verification: `pnpm run test` (server 233, web 262, youtube 22, e2e 21), `pnpm run build`, `pnpm run lint` pass. No em dashes. Not committed.
