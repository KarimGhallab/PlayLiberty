import { describe, expect, it } from 'vitest';

import {
  SPONSORBLOCK_FAILURE_REASON,
  YoutubeSponsorBlockError,
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
