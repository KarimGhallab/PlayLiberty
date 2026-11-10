import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@playliberty/api-client';
import { endpoints } from '@playliberty/contracts';

import { restoreLocation, stubLocationAssign } from '../../../testing/location';
import { mockUrl } from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import { transport } from '../transport';

/*
 * The re-auth guard: a `401` needs a top-level navigation, while a second
 * refusal in the tab must not navigate again. The record survives navigation.
 */

const RE_AUTH_ATTEMPT_KEY = 'playliberty.re-auth-attempt';
const ME = mockUrl(endpoints.currentAccount);

afterEach(() => {
  restoreLocation();
  window.sessionStorage.clear();
});

describe('the cookie adapter', () => {
  it('navigates to the edge on the first refusal and records the attempt', async () => {
    const assign = stubLocationAssign();
    server.use(http.get(ME, () => new HttpResponse(null, { status: 401 })));

    await expect(
      transport.send(endpoints.currentAccount)
    ).rejects.toBeInstanceOf(ApiError);

    expect(assign).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(RE_AUTH_ATTEMPT_KEY)).toBe('1');
  });

  it('surfaces the problem on a second refusal in the tab instead of navigating', async () => {
    const assign = stubLocationAssign();
    window.sessionStorage.setItem(RE_AUTH_ATTEMPT_KEY, '1');
    server.use(
      http.get(ME, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Unauthenticated',
            status: 401,
            code: 'unauthenticated',
            detail: 'The session has expired.'
          },
          { status: 401 }
        )
      )
    );

    let caught: unknown;

    try {
      await transport.send(endpoints.currentAccount);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught instanceof ApiError ? caught.problem?.title : null).toBe(
      'Unauthenticated'
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it('clears the record once a request succeeds, so a later expiry can re-authenticate', async () => {
    window.sessionStorage.setItem(RE_AUTH_ATTEMPT_KEY, '1');

    await transport.send(endpoints.currentAccount);

    expect(window.sessionStorage.getItem(RE_AUTH_ATTEMPT_KEY)).toBeNull();
  });
});
