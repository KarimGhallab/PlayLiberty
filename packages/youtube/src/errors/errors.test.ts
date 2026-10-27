import { describe, expect, it } from 'vitest';

import { SourceFailureKind } from '../types.js';
import {
  EGRESS_BLOCKED_REASON,
  EgressCircuitOpenError,
  EgressSourceUnavailableError,
  FailureDisposition,
  SPONSORBLOCK_FAILURE_REASON,
  YoutubeSponsorBlockError,
  YoutubeVideoUnavailableError,
  classifySourceFailure,
  failureMeaning,
  failureOf,
  isSponsorBlockFailureMessage,
  isVideoUnavailableMessage
} from './errors.js';

/* The two sets must not overlap: a phrase in both would make a retryable outage
 * permanently terminal. */

describe('the SponsorBlock failure classification', () => {
  it('recognises the phrases yt-dlp reports an outage with', () => {
    expect(
      isSponsorBlockFailureMessage(
        'Unable to communicate with SponsorBlock API'
      )
    ).toBe(true);
    expect(
      isSponsorBlockFailureMessage('SponsorBlock information is unavailable')
    ).toBe(true);
  });

  it('does not classify a gone video as a SponsorBlock failure', () => {
    expect(isSponsorBlockFailureMessage('Video unavailable')).toBe(false);
  });

  it('does not classify a SponsorBlock outage as a gone video', () => {
    expect(
      isVideoUnavailableMessage('SponsorBlock information is unavailable')
    ).toBe(false);
    expect(
      isVideoUnavailableMessage('Unable to communicate with SponsorBlock API')
    ).toBe(false);
  });

  it('carries a fixed reason and not the video id', () => {
    const error = new YoutubeSponsorBlockError('dQw4w9WgXcQ');

    expect(error.message).toBe(SPONSORBLOCK_FAILURE_REASON);
    expect(error.message).not.toContain('dQw4w9WgXcQ');
    expect(error.videoId).toBe('dQw4w9WgXcQ');
  });
});

describe('the failure vocabulary', () => {
  it('classifies each phrase yt-dlp reports a failure with', () => {
    expect(classifySourceFailure('ERROR: Private video')).toBe(
      SourceFailureKind.Private
    );
    expect(classifySourceFailure('ERROR: Video unavailable')).toBe(
      SourceFailureKind.Unavailable
    );
    expect(classifySourceFailure('HTTP Error 403: Forbidden')).toBe(
      SourceFailureKind.Blocked
    );
    expect(classifySourceFailure('Connection refused')).toBe(
      SourceFailureKind.Network
    );
    expect(classifySourceFailure('something else')).toBe(
      SourceFailureKind.Unknown
    );
  });

  it('names one disposition and one sentence per kind', () => {
    expect(failureMeaning(SourceFailureKind.Unavailable)).toEqual({
      kind: SourceFailureKind.Unavailable,
      disposition: FailureDisposition.Terminal,
      sentence: 'The source is not available.'
    });
    expect(failureMeaning(SourceFailureKind.Private)).toEqual({
      kind: SourceFailureKind.Private,
      disposition: FailureDisposition.Terminal,
      sentence: 'The source is private.'
    });
    expect(failureMeaning(SourceFailureKind.Blocked)).toEqual({
      kind: SourceFailureKind.Blocked,
      disposition: FailureDisposition.ExitFault,
      sentence: 'YouTube refused the request from the exit.'
    });
    expect(failureMeaning(SourceFailureKind.Network)).toEqual({
      kind: SourceFailureKind.Network,
      disposition: FailureDisposition.ExitFault,
      sentence: 'The exit could not be reached.'
    });
    expect(failureMeaning(SourceFailureKind.Unknown)).toEqual({
      kind: SourceFailureKind.Unknown,
      disposition: FailureDisposition.Retry,
      sentence: 'The source could not be read.'
    });
  });

  it('blames the exit for a bot check, a 403, a 429 and a handshake failure', () => {
    for (const message of [
      'ERROR: Sign in to confirm you are not a bot',
      'HTTP Error 403: Forbidden',
      'HTTP Error 429: Too Many Requests',
      'WireGuard handshake did not complete'
    ]) {
      const meaning = failureMeaning(classifySourceFailure(message));

      expect(meaning.disposition).toBe(FailureDisposition.ExitFault);
    }
  });

  it('blames the exit for a timeout, a DNS failure and a refused connection', () => {
    for (const message of [
      'The read timed out',
      'Temporary failure in name resolution',
      'getaddrinfo ENOTFOUND www.youtube.com',
      'Connection refused'
    ]) {
      expect(failureMeaning(classifySourceFailure(message)).disposition).toBe(
        FailureDisposition.ExitFault
      );
    }
  });

  it('never blames the exit for a gone video or a 404', () => {
    expect(
      failureMeaning(classifySourceFailure('Video unavailable')).disposition
    ).toBe(FailureDisposition.Terminal);
    expect(
      failureMeaning(classifySourceFailure('HTTP Error 404: Not Found'))
        .disposition
    ).toBe(FailureDisposition.Terminal);
    expect(
      failureMeaning(classifySourceFailure('ERROR: Private video')).disposition
    ).toBe(FailureDisposition.Terminal);
  });

  it('never blames the exit for a SponsorBlock outage or a malformed URL', () => {
    expect(
      failureMeaning(
        classifySourceFailure('Unable to communicate with SponsorBlock API')
      ).disposition
    ).toBe(FailureDisposition.Retry);
    expect(
      failureMeaning(classifySourceFailure('not a YouTube URL')).disposition
    ).toBe(FailureDisposition.Retry);
  });
});

describe('the failure types', () => {
  it('carries the terminal meaning on a gone video', () => {
    const error = new YoutubeVideoUnavailableError('dQw4w9WgXcQ');

    expect(error.failure).toEqual({
      kind: SourceFailureKind.Unavailable,
      disposition: FailureDisposition.Terminal,
      sentence: error.message
    });
  });

  it('carries the retry meaning on a SponsorBlock failure', () => {
    expect(new YoutubeSponsorBlockError('dQw4w9WgXcQ').failure).toEqual({
      kind: SourceFailureKind.Unknown,
      disposition: FailureDisposition.Retry,
      sentence: SPONSORBLOCK_FAILURE_REASON
    });
  });

  it('carries the fixed blocked sentence on the circuit error', () => {
    const error = new EgressCircuitOpenError();

    expect(error.message).toBe(EGRESS_BLOCKED_REASON);
    expect(error.failure).toEqual({
      kind: SourceFailureKind.Blocked,
      disposition: FailureDisposition.Interrupted,
      sentence: EGRESS_BLOCKED_REASON
    });
  });

  it('reads the disposition of a source failure from its reason', () => {
    expect(
      new EgressSourceUnavailableError(SourceFailureKind.Blocked).failure
        .disposition
    ).toBe(FailureDisposition.ExitFault);
    expect(
      new EgressSourceUnavailableError(SourceFailureKind.Unavailable).failure
        .disposition
    ).toBe(FailureDisposition.Terminal);
  });

  it('reads the kind of an untyped error from its message, still retryable', () => {
    expect(failureOf(new Error('HTTP Error 403: Forbidden'))).toEqual({
      kind: SourceFailureKind.Blocked,
      disposition: FailureDisposition.Retry,
      sentence: 'YouTube refused the request from the exit.'
    });
    expect(failureOf(new Error('boom'))).toEqual({
      kind: SourceFailureKind.Unknown,
      disposition: FailureDisposition.Retry,
      sentence: 'The source could not be read.'
    });
  });
});
