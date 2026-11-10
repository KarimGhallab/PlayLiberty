import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import type { MobileToken } from '@playliberty/contracts';

import {
  accessTokenOf,
  recordFromToken,
  sessionRecordStore
} from './sessionRecord';

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
    },
    __set: (key: string, value: string) => {
      values.set(key, value);
    }
  };
});

const store = SecureStore as unknown as {
  __clear: () => void;
  __set: (key: string, value: string) => void;
};

const RECEIVED_AT = Date.parse('2026-11-01T12:00:00.000Z');

function tokenPair(): MobileToken {
  return {
    access: {
      id: 'token-id',
      secret: 'token-secret',
      expires_at: '2026-11-02T00:00:00.000Z',
      expires_in: 43_200
    },
    refresh: {
      token: 'refresh-token',
      expires_at: '2027-04-30T12:00:00.000Z',
      expires_in: 15_552_000
    }
  };
}

beforeEach(() => {
  store.__clear();
});

describe('the session record', () => {
  it('computes the access deadline from the server duration', () => {
    const record = recordFromToken(tokenPair(), RECEIVED_AT);

    expect(record).toEqual({
      accessId: 'token-id',
      accessSecret: 'token-secret',
      accessDeadline: RECEIVED_AT + 43_200_000,
      refreshToken: 'refresh-token',
      refreshExpiresAt: '2027-04-30T12:00:00.000Z'
    });
  });

  it('round-trips one record and yields the access pair', async () => {
    const record = recordFromToken(tokenPair(), RECEIVED_AT);

    await sessionRecordStore.write(record);

    expect(await sessionRecordStore.read()).toEqual(record);
    expect(accessTokenOf(record)).toEqual({
      id: 'token-id',
      secret: 'token-secret'
    });
  });

  it('is signed out when nothing is stored', async () => {
    expect(await sessionRecordStore.read()).toBeNull();
  });

  it('is signed out when the stored value is not JSON', async () => {
    store.__set('playliberty.session', 'not-json');

    expect(await sessionRecordStore.read()).toBeNull();
  });

  it('is signed out when a field is missing', async () => {
    store.__set(
      'playliberty.session',
      JSON.stringify({ accessId: 'token-id', accessSecret: 'token-secret' })
    );

    expect(await sessionRecordStore.read()).toBeNull();
  });

  it('clears the record', async () => {
    await sessionRecordStore.write(recordFromToken(tokenPair(), RECEIVED_AT));

    await sessionRecordStore.clear();

    expect(await sessionRecordStore.read()).toBeNull();
  });
});
