import { describe, expect, it } from 'vitest';

import type { Track } from '@playliberty/contracts';
import {
  Provider,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';

import type { TrackAction } from './trackActions.js';
import { trackActionsFor } from './trackActions.js';

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

function keys(actions: readonly TrackAction[]): string[] {
  return actions.map(action => action.key);
}

describe('the track actions model', () => {
  it('keeps Copy link universal', () => {
    expect(keys(trackActionsFor(track, false, false, false))).toEqual(['copy']);
  });

  it('offers Remove to a writer on a stored track', () => {
    expect(keys(trackActionsFor(track, true, true, false))).toEqual([
      'copy',
      'remove'
    ]);
  });

  it('offers Retry, Fetch whole and Remove for a failed track a writer may repair', () => {
    expect(
      keys(trackActionsFor({ ...track, fileStatus: TrackFileStatus.Failed }, true, true, false))
    ).toEqual(['copy', 'retry', 'fetchWhole', 'remove']);
  });

  it('drops Fetch whole when the skip setting is off', () => {
    expect(
      keys(trackActionsFor({ ...track, fileStatus: TrackFileStatus.Failed }, true, false, false))
    ).toEqual(['copy', 'retry', 'remove']);
  });

  it('offers no repair or Remove to a read collaborator', () => {
    expect(
      keys(trackActionsFor({ ...track, fileStatus: TrackFileStatus.Failed }, false, true, false))
    ).toEqual(['copy']);
  });

  it('keeps only Copy link while the row is busy', () => {
    expect(
      keys(trackActionsFor({ ...track, fileStatus: TrackFileStatus.Failed }, true, true, true))
    ).toEqual(['copy']);
  });
});
