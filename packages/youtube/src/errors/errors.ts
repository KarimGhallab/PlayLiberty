/*
 * A gone video is terminal and a SponsorBlock outage is transient: one is
 * pointless to retry, the other is the point of retrying. The phrases are
 * yt-dlp's own.
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

/* A SponsorBlock outage is third-party and transient, so it is classified
 * separately from the gone video, which is terminal. */
const SPONSORBLOCK_PATTERNS: RegExp[] = [
  /unable to communicate with sponsorblock api/i,
  /sponsorblock information is unavailable/i
];

export function isSponsorBlockFailureMessage(message: string): boolean {
  return SPONSORBLOCK_PATTERNS.some(pattern => pattern.test(message));
}

/* Fixed here so a client renders a sentence rather than yt-dlp's stderr. It
 * names the outcome, carries no video id, and is the same for every track. */
export const SPONSORBLOCK_FAILURE_REASON =
  'The non-music parts could not be fetched.';

/* Thrown instead of the raw process error, so a caller distinguishes by type
 * rather than by matching the message. */
export class YoutubeVideoUnavailableError extends Error {
  readonly videoId: string;

  constructor(videoId: string) {
    super(`The video ${videoId} is not available.`);
    this.name = 'YoutubeVideoUnavailableError';
    this.videoId = videoId;
  }
}

/* Retryable, and its message is the fixed reason, not the tool's output. */
export class YoutubeSponsorBlockError extends Error {
  readonly videoId: string;

  constructor(videoId: string) {
    super(SPONSORBLOCK_FAILURE_REASON);
    this.name = 'YoutubeSponsorBlockError';
    this.videoId = videoId;
  }
}
