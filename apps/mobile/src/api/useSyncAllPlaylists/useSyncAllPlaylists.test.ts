import { describe, expect, it, jest } from '@jest/globals';

import { ProblemCode } from '@playliberty/contracts';

import { ApiError } from '../apiClient/ApiClient';
import { runSyncAll } from './useSyncAllPlaylists';

const refusal = (code: ProblemCode, status = 409) =>
  new ApiError(status, {
    type: 'about:blank',
    title: 'Refused',
    status,
    code
  });

describe('the bulk sync loop', () => {
  it('starts every playlist once, counting a running one and going on', async () => {
    const start = jest.fn(async (playlistId: string) => {
      if (playlistId === 'b') {
        throw refusal(ProblemCode.SyncAlreadyRunning);
      }
    });

    const outcome = await runSyncAll(['a', 'b', 'c'], start);

    expect(start.mock.calls.map(([playlistId]) => playlistId)).toEqual([
      'a',
      'b',
      'c'
    ]);
    expect(outcome).toEqual({ started: 2, alreadyRunning: 1, stopped: null });
  });

  it('stops at the first other refusal and keeps the tally so far', async () => {
    const stopped = refusal(ProblemCode.InternalError, 503);
    const start = jest.fn(async (playlistId: string) => {
      if (playlistId === 'b') {
        throw stopped;
      }
    });

    const outcome = await runSyncAll(['a', 'b', 'c'], start);

    expect(start).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({
      started: 1,
      alreadyRunning: 0,
      stopped
    });
  });
});
