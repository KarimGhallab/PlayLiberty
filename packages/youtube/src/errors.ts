/*
 * A video that is gone is not a transient failure: one is pointless to retry and
 * the other is the whole point of retrying. The adapter is what tells them apart,
 * because the phrases below are yt-dlp's own and the tool stays behind this package.
 */
const UNAVAILABLE_PATTERNS: RegExp[] = [
  /video unavailable/i,
  /this video is not available/i,
  /the uploader has not made this video available/i,
  /private video/i,
  /video has been deleted/i,
  /has been removed/i,
  /no longer available/i,
  /removed by the uploader/i
];

export function isVideoUnavailableMessage(message: string): boolean {
  return UNAVAILABLE_PATTERNS.some(pattern => pattern.test(message));
}

/*
 * A SponsorBlock lookup that fails is transient: the community API is a third
 * party and an outage says nothing about the video. It is classified separately
 * from a gone video so the track is retried rather than treated as terminal. The
 * phrases are yt-dlp's own, like the unavailable ones above.
 */
const SPONSORBLOCK_PATTERNS: RegExp[] = [
  /unable to communicate with sponsorblock api/i,
  /sponsorblock information is unavailable/i
];

export function isSponsorBlockFailureMessage(message: string): boolean {
  return SPONSORBLOCK_PATTERNS.some(pattern => pattern.test(message));
}

/*
 * The reason a SponsorBlock failure is recorded with, fixed here so a client
 * renders a sentence rather than yt-dlp's stderr and the retry semantics stay
 * legible. It names the outcome and not the cause, and it carries no video id,
 * because the stored reason is the same for every track.
 */
export const SPONSORBLOCK_FAILURE_REASON =
  'The non-music parts could not be fetched.';

/*
 * Thrown instead of the raw process error, so a caller distinguishes a gone video
 * by type rather than by matching the message itself.
 */
export class YoutubeVideoUnavailableError extends Error {
  readonly videoId: string;

  constructor(videoId: string) {
    super(`The video ${videoId} is not available.`);
    this.name = 'YoutubeVideoUnavailableError';
    this.videoId = videoId;
  }
}

/*
 * Thrown instead of the raw process error for a SponsorBlock failure, which is
 * retryable. Its message is the fixed reason, not the tool's output.
 */
export class YoutubeSponsorBlockError extends Error {
  readonly videoId: string;

  constructor(videoId: string) {
    super(SPONSORBLOCK_FAILURE_REASON);
    this.name = 'YoutubeSponsorBlockError';
    this.videoId = videoId;
  }
}
