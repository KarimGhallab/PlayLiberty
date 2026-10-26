import { describe, expect, it } from 'vitest';

import {
  EGRESS_BLOCKED_REASON,
  EgressCircuitOpenError,
  SPONSORBLOCK_FAILURE_REASON,
  YoutubeSponsorBlockError,
  classifyEgressFailure,
  isExitLevelFailure,
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

describe('the exit-level classification', () => {
  it('blames the exit for a bot check, a 403, a 429 and a handshake failure', () => {
    for (const message of [
      'ERROR: Sign in to confirm you are not a bot',
      'HTTP Error 403: Forbidden',
      'HTTP Error 429: Too Many Requests',
      'WireGuard handshake did not complete'
    ]) {
      const reason = classifyEgressFailure(message);

      expect(isExitLevelFailure(reason)).toBe(true);
    }
  });

  it('blames the exit for a timeout, a DNS failure and a refused connection', () => {
    for (const message of [
      'The read timed out',
      'Temporary failure in name resolution',
      'getaddrinfo ENOTFOUND www.youtube.com',
      'Connection refused'
    ]) {
      expect(isExitLevelFailure(classifyEgressFailure(message))).toBe(true);
    }
  });

  it('never blames the exit for a gone video or a 404', () => {
    expect(classifyEgressFailure('Video unavailable')).toBe('unavailable');
    expect(classifyEgressFailure('HTTP Error 404: Not Found')).toBe(
      'unavailable'
    );
    expect(isExitLevelFailure('unavailable')).toBe(false);
  });

  it('never blames the exit for a SponsorBlock outage or a malformed URL', () => {
    expect(
      isExitLevelFailure(
        classifyEgressFailure('Unable to communicate with SponsorBlock API')
      )
    ).toBe(false);
    expect(isExitLevelFailure(classifyEgressFailure('not a YouTube URL'))).toBe(
      false
    );
  });

  it('carries the fixed blocked sentence on the circuit error', () => {
    expect(new EgressCircuitOpenError().message).toBe(EGRESS_BLOCKED_REASON);
  });
});
