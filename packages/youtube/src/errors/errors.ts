import type { EgressFailure } from '../types.js';

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
  /removed by the uploader/i,
  /http error 404/i
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

/* A check failure has to become one of four sentences, never the tool's own
 * stderr. The order matters: a gone video is not an exit fault. */
const BLOCKED_PATTERNS: RegExp[] = [
  /sign in to confirm/i,
  /confirm you.re not a bot/i,
  /http error 403/i,
  /http error 429/i
];

const NETWORK_PATTERNS: RegExp[] = [
  /timed out/i,
  /timeout/i,
  /connection (?:refused|reset|closed)/i,
  /temporary failure in name resolution/i,
  /name or service not known/i,
  /no address associated with hostname/i,
  /getaddrinfo/i,
  /network is unreachable/i,
  /unable to download webpage/i,
  /unable to connect/i,
  /handshake/i
];

export function classifyEgressFailure(message: string): EgressFailure {
  if (isVideoUnavailableMessage(message)) {
    return 'unavailable';
  }

  /* A SponsorBlock outage is third-party and transient, never the exit. */
  if (isSponsorBlockFailureMessage(message)) {
    return 'unknown';
  }

  if (BLOCKED_PATTERNS.some(pattern => pattern.test(message))) {
    return 'blocked';
  }

  if (NETWORK_PATTERNS.some(pattern => pattern.test(message))) {
    return 'network';
  }

  return 'unknown';
}

/* The reasons a config can be blamed for. A gone video, a 404, a SponsorBlock
 * outage and a malformed URL are never the exit's. */
export function isExitLevelFailure(reason: EgressFailure): boolean {
  return reason === 'blocked' || reason === 'network';
}

/* The one sentence a blocked run carries, never the vendor's output. */
export const EGRESS_BLOCKED_REASON =
  'The source is unreachable from every exit.';

/* Every config is marked failed, so the circuit is open and no exit can be
 * asked. The caller maps it to `blocked` rather than a failed row per track. */
export class EgressCircuitOpenError extends Error {
  constructor() {
    super(EGRESS_BLOCKED_REASON);
    this.name = 'EgressCircuitOpenError';
  }
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
