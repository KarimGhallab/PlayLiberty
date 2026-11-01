import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import type { MobileToken } from '@playliberty/contracts';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import { mobileSession } from '../session/session';
import { sessionRecordStore } from '../sessionRecord/sessionRecord';
import { SessionStatus, useSessionStore } from './sessionStore';

jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();

  return {
    getItemAsync: async (key: string) => values.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key: string) => {
      values.delete(key);
    },
    __clear: () => {
      values.clear();
    }
  };
});

const store = SecureStore as unknown as { __clear: () => void };

const PAIR: MobileToken = {
  access: {
    id: 'token-id',
    secret: 'token-secret',
    expires_at: '2026-11-01T13:00:00.000Z',
    expires_in: 3600
  },
  refresh: {
    token: 'refresh-token',
    expires_at: '2027-04-30T12:00:00.000Z',
    expires_in: 86_400
  }
};

let fetchMock: jest.SpiedFunction<typeof fetch>;

beforeEach(async () => {
  fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(null, { status: 204 }));
  store.__clear();
  await mobileSession.clear();
  useSessionStore.setState({ status: SessionStatus.Loading });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the session', () => {
  it('marks the session signed in when a record is stored', async () => {
    await mobileSession.adopt(PAIR);

    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedIn);
  });

  it('marks the session signed out when nothing is stored', async () => {
    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedOut);
  });

  it('forgets the record, clears the player and signs out', async () => {
    await mobileSession.adopt(PAIR);
    usePlayerStore.getState().startBareTrack({
      id: 'track-1',
      title: 'First Song',
      durationSeconds: 60,
      thumbnailPath: null
    });

    await useSessionStore.getState().expire();

    expect(await sessionRecordStore.read()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedOut);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().queue).toEqual([]);
  });
});
