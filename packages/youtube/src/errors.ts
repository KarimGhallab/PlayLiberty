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
