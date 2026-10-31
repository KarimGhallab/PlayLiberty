import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import { tokenStore } from '../tokenStore';
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

beforeEach(() => {
  store.__clear();
  useSessionStore.setState({ status: SessionStatus.Loading });
});

describe('the session', () => {
  it('marks the session signed in when a token is stored', async () => {
    await tokenStore.write({ id: 'token-id', secret: 'token-secret' });

    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedIn);
  });

  it('marks the session signed out when nothing is stored', async () => {
    await useSessionStore.getState().refresh();

    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedOut);
  });

  it('forgets the token, clears the player and signs out', async () => {
    await tokenStore.write({ id: 'token-id', secret: 'token-secret' });
    usePlayerStore.getState().startBareTrack({
      id: 'track-1',
      title: 'First Song',
      durationSeconds: 60,
      thumbnailPath: null
    });

    await useSessionStore.getState().expire();

    expect(await tokenStore.read()).toBeNull();
    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedOut);
    expect(usePlayerStore.getState().currentId).toBeNull();
    expect(usePlayerStore.getState().queue).toEqual([]);
  });
});
