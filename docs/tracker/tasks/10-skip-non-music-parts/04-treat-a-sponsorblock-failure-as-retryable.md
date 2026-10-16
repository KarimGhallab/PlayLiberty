# 04: Treat a SponsorBlock failure as retryable, not a gone video

**Status:** resolved

## Outcome

`errors.ts` gains a second classification beside the gone-video one: `isSponsorBlockFailureMessage` matches yt-dlp's two outage phrases (`Unable to communicate with SponsorBlock API` and `SponsorBlock information is unavailable`), and `YoutubeSponsorBlockError` is the typed error whose message is `SPONSORBLOCK_FAILURE_REASON`, a fixed sentence with no video id, so the stored reason is the same for every track; the package index exports the three names. `downloadTrack` classifies after the unavailable check, and the two pattern sets do not overlap, which is what keeps an outage retryable. The worker's transient branch records `failed` with the typed error's fixed message rather than running it through `summarizeFailure`, so the reason cannot drift with the tool's output, and it never reaches `markTrackSourceRemoved`, so `sourceStatus` stays `available`.

See [`10-skip-non-music-parts`](../../specs/10-skip-non-music-parts.md).
