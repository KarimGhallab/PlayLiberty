import { describe, expect, it } from '@jest/globals';

import {
  Provider,
  type Track,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import { type TrackAction, trackActionsFor } from './trackActions';

const track: Track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'First Song',
  durationSeconds: 182,
  skipNonMusic: false,
  thumbnailPath: null,
  fileStatus: TrackFileStatus.Stored,
  sourceStatus: TrackSourceStatus.Available,
  failureKind: null,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

const failed: Track = {
  ...track,
  fileStatus: TrackFileStatus.Failed
};

function keys(actions: readonly TrackAction[]): string[] {
  return actions.map(action => action.key);
}

describe('the track sheet actions', () => {
  it('keeps Copy link universal', () => {
    expect(keys(trackActionsFor(track, false, false, false))).toEqual(['copy']);
  });

  it('offers Retry and Fetch whole for a failed track a writer may repair', () => {
    expect(keys(trackActionsFor(failed, true, true, false))).toEqual([
      'copy',
      'retry',
      'fetchWhole'
    ]);
  });

  it('drops Fetch whole when the skip setting is off', () => {
    expect(keys(trackActionsFor(failed, true, false, false))).toEqual([
      'copy',
      'retry'
    ]);
  });

  it('offers no repair to a read collaborator', () => {
    expect(keys(trackActionsFor(failed, false, true, false))).toEqual(['copy']);
  });

  it('keeps only Copy link while the row is busy', () => {
    expect(keys(trackActionsFor(failed, true, true, true))).toEqual(['copy']);
  });
});
