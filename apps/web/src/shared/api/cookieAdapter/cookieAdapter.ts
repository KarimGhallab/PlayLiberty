import {
  ApiError,
  type TransportAdapter,
  readProblem
} from '@playliberty/api-client';

const RE_AUTH_ATTEMPT_KEY = 'playliberty.re-auth-attempt';

/*
 * The cookie half of the transport. A `401` or SSO redirect triggers one
 * navigation per tab, then fails rather than looping.
 */

function readReAuthAttempt(): boolean {
  try {
    return window.sessionStorage.getItem(RE_AUTH_ATTEMPT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeReAuthAttempt(attempted: boolean): void {
  try {
    if (attempted) {
      window.sessionStorage.setItem(RE_AUTH_ATTEMPT_KEY, '1');
      return;
    }

    window.sessionStorage.removeItem(RE_AUTH_ATTEMPT_KEY);
  } catch {
    // A storage that refuses the write must not become a reload loop.
  }
}

function needsAuthentication(response: Response): boolean {
  return response.status === 401 || response.type === 'opaqueredirect';
}

export function cookieAdapter(): TransportAdapter {
  return {
    async send({ url, init }) {
      const response = await fetch(url, {
        credentials: 'same-origin',
        redirect: 'manual',
        ...init
      });

      if (!needsAuthentication(response)) {
        writeReAuthAttempt(false);
        return response;
      }

      if (readReAuthAttempt()) {
        throw new ApiError(response.status, await readProblem(response));
      }

      writeReAuthAttempt(true);
      window.location.assign(window.location.href);
      throw new ApiError(401, null);
    }
  };
}
