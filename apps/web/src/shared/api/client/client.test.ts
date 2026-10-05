import { HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import { AccountSummarySchema } from '@playliberty/contracts';

import { restoreLocation, stubLocationAssign } from '../../../testing/location';
import { server } from '../../../testing/mocks/server';
import { ApiError, apiGet } from './client';

/*
 * The re-authentication guard, which is the client half of the edge's session.
 * A `401` means the edge must re-run its flow, which only a top-level navigation
 * can do; a second refusal in the same tab must not navigate again, or a broken
 * edge becomes a reload loop with no exit. The tab's record lives in session
 * storage, so it survives the navigation the first refusal causes.
 */

const RE_AUTH_ATTEMPT_KEY = 'playliberty.re-auth-attempt';
const ME = 'http://localhost:3000/api/v1/me';

afterEach(() => {
  restoreLocation();
  window.sessionStorage.clear();
});

describe('the re-authentication guard', () => {
  it('navigates to the edge on the first refusal and records the attempt', async () => {
    const assign = stubLocationAssign();
    server.use(http.get(ME, () => new HttpResponse(null, { status: 401 })));

    await expect(apiGet('/me', AccountSummarySchema)).rejects.toBeInstanceOf(
      ApiError
    );

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
      await apiGet('/me', AccountSummarySchema);
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

    await apiGet('/me', AccountSummarySchema);

    expect(window.sessionStorage.getItem(RE_AUTH_ATTEMPT_KEY)).toBeNull();
  });
});
