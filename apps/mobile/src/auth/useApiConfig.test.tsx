import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { apiBaseUrl } from '../api/apiBaseUrl';
import { mobileSession } from './session/session';
import type { SessionRecord } from './sessionRecord/sessionRecord';
import { SessionStatus, useSessionStore } from './sessionStore/sessionStore';
import { useApiConfig } from './useApiConfig';

jest.mock('./session/session', () => ({
  mobileSession: {
    subscribe: jest.fn(() => () => {}),
    accessToken: jest.fn(),
    usableAccessToken: jest.fn(),
    load: jest.fn()
  }
}));

const accessToken = jest.mocked(mobileSession.accessToken);
const usableAccessToken = jest.mocked(mobileSession.usableAccessToken);
const subscribe = jest.mocked(mobileSession.subscribe);

function record(accessId: string, accessSecret: string): SessionRecord {
  return {
    accessId,
    accessSecret,
    accessDeadline: Date.now() + 3_600_000,
    refreshToken: 'refresh-token',
    refreshExpiresAt: '2027-04-30T12:00:00.000Z'
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  accessToken.mockResolvedValue({ id: 'access-1', secret: 'secret-1' });
  usableAccessToken.mockResolvedValue(null);
  useSessionStore.setState({ status: SessionStatus.SignedIn });
});

describe('the API config', () => {
  it('keeps the pair a transient renewal could not replace', async () => {
    accessToken.mockRejectedValueOnce(new Error('offline'));
    usableAccessToken.mockResolvedValue({
      id: 'access-1',
      secret: 'secret-1'
    });

    const { result } = await renderHook(() => useApiConfig());

    await waitFor(() =>
      expect(result.current?.token).toEqual({
        id: 'access-1',
        secret: 'secret-1'
      })
    );
    expect(usableAccessToken).toHaveBeenCalled();
  });

  it('follows a renewed record without a relaunch', async () => {
    const { result } = await renderHook(() => useApiConfig());

    await waitFor(() =>
      expect(result.current?.token).toEqual({
        id: 'access-1',
        secret: 'secret-1'
      })
    );

    const listener = subscribe.mock.calls.at(-1)?.[0];

    await act(async () => {
      listener?.(record('access-2', 'secret-2'));
    });

    expect(result.current).toEqual({
      baseUrl: apiBaseUrl(),
      token: { id: 'access-2', secret: 'secret-2' }
    });
  });
});
