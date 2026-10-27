import { SourceFailureKind } from '../types.js';

/*
 * What a failed read means to its caller. The two decisions travel together:
 * what the Track row stores, and whether the failure is the source's, the
 * exit's, or nobody's fault.
 */
export enum FailureDisposition {
  /* Gone for good: the source is marked removed, never retried. */
  Terminal = 'terminal',
  /* The row failed, and the next sync or pass retries it. */
  Retry = 'retry',
  /* Not the track's fault: the claim returns to pending and nothing counts. */
  Interrupted = 'interrupted',
  /* The exit is at fault: the policy counts it and may rotate. */
  ExitFault = 'exitFault'
}

export interface FailureMeaning {
  kind: SourceFailureKind;
  disposition: FailureDisposition;
  sentence: string;
}

/*
 * A gone video is terminal and a SponsorBlock outage is transient: one is
 * pointless to retry, the other is the point of retrying. The phrases are
 * yt-dlp's own.
 */
const UNAVAILABLE_PATTERNS: RegExp[] = [
  /video unavailable/i,
  /this video is not available/i,
  /the uploader has not made this video available/i,
  /video has been deleted/i,
  /has been removed/i,
  /no longer available/i,
  /removed by the uploader/i,
  /http error 404/i
];

const PRIVATE_PATTERNS: RegExp[] = [
  /private video/i,
  /this video is private/i,
  /video is private/i
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

/* A check failure has to become one of five kinds, never the tool's own
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

export function classifySourceFailure(message: string): SourceFailureKind {
  if (PRIVATE_PATTERNS.some(pattern => pattern.test(message))) {
    return SourceFailureKind.Private;
  }

  if (isVideoUnavailableMessage(message)) {
    return SourceFailureKind.Unavailable;
  }

  /* A SponsorBlock outage is third-party and transient, never the exit. */
  if (isSponsorBlockFailureMessage(message)) {
    return SourceFailureKind.Unknown;
  }

  if (BLOCKED_PATTERNS.some(pattern => pattern.test(message))) {
    return SourceFailureKind.Blocked;
  }

  if (NETWORK_PATTERNS.some(pattern => pattern.test(message))) {
    return SourceFailureKind.Network;
  }

  return SourceFailureKind.Unknown;
}

const SOURCE_FAILURE_SENTENCES: Record<SourceFailureKind, string> = {
  [SourceFailureKind.Unavailable]: 'The source is not available.',
  [SourceFailureKind.Private]: 'The source is private.',
  [SourceFailureKind.Blocked]: 'YouTube refused the request from the exit.',
  [SourceFailureKind.Network]: 'The exit could not be reached.',
  [SourceFailureKind.Unknown]: 'The source could not be read.'
};

/* The one table from a kind to its disposition and sentence. A new kind edits
 * this switch and the compiler names every site that has to answer it. */
export function failureMeaning(kind: SourceFailureKind): FailureMeaning {
  switch (kind) {
    case SourceFailureKind.Unavailable:
    case SourceFailureKind.Private:
      return {
        kind,
        disposition: FailureDisposition.Terminal,
        sentence: SOURCE_FAILURE_SENTENCES[kind]
      };
    case SourceFailureKind.Blocked:
    case SourceFailureKind.Network:
      return {
        kind,
        disposition: FailureDisposition.ExitFault,
        sentence: SOURCE_FAILURE_SENTENCES[kind]
      };
    case SourceFailureKind.Unknown:
      return {
        kind,
        disposition: FailureDisposition.Retry,
        sentence: SOURCE_FAILURE_SENTENCES[kind]
      };
  }
}

/* Every failure type carries its meaning, so no caller re-derives one from an
 * error class. */
export abstract class SourceFailureError extends Error {
  public abstract readonly failure: FailureMeaning;
}

/*
 * The one reading of an error no type claims: its message still names the kind,
 * but without a typed meaning the caller cannot count it against an exit, so it
 * stays retryable.
 */
export function failureOf(error: unknown): FailureMeaning {
  if (error instanceof SourceFailureError) {
    return error.failure;
  }

  const kind = classifySourceFailure(
    error instanceof Error ? error.message : String(error)
  );

  return { ...failureMeaning(kind), disposition: FailureDisposition.Retry };
}

/* The one sentence a blocked run carries, never the vendor's output. */
export const EGRESS_BLOCKED_REASON =
  'The source is unreachable from every exit.';

/* Every config is marked failed, so the circuit is open and no exit can be
 * asked. The caller maps it to `blocked` rather than a failed row per track. */
export class EgressCircuitOpenError extends SourceFailureError {
  public readonly failure: FailureMeaning = {
    kind: SourceFailureKind.Blocked,
    disposition: FailureDisposition.Interrupted,
    sentence: EGRESS_BLOCKED_REASON
  };

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
export class YoutubeVideoUnavailableError extends SourceFailureError {
  readonly videoId: string;
  public readonly failure: FailureMeaning;

  constructor(videoId: string) {
    super(`The video ${videoId} is not available.`);
    this.name = 'YoutubeVideoUnavailableError';
    this.videoId = videoId;
    this.failure = {
      kind: SourceFailureKind.Unavailable,
      disposition: FailureDisposition.Terminal,
      sentence: this.message
    };
  }
}

/* Retryable, and its message is the fixed reason, not the tool's output. */
export class YoutubeSponsorBlockError extends SourceFailureError {
  readonly videoId: string;
  public readonly failure: FailureMeaning = {
    kind: SourceFailureKind.Unknown,
    disposition: FailureDisposition.Retry,
    sentence: SPONSORBLOCK_FAILURE_REASON
  };

  constructor(videoId: string) {
    super(SPONSORBLOCK_FAILURE_REASON);
    this.name = 'YoutubeSponsorBlockError';
    this.videoId = videoId;
  }
}

/* The exit could not read the source. The reason is the classified kind; the
 * message is a sentence a run can carry. */
export class EgressSourceUnavailableError extends SourceFailureError {
  readonly reason: SourceFailureKind;
  public readonly failure: FailureMeaning;

  constructor(reason: SourceFailureKind) {
    const failure = failureMeaning(reason);

    super(failure.sentence);
    this.name = 'EgressSourceUnavailableError';
    this.reason = reason;
    this.failure = failure;
  }
}
