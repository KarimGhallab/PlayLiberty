import { configureApiClient, createTransport } from '@playliberty/api-client';

import { mobileSession } from '../auth/session/session';
import { apiBaseUrl } from './apiBaseUrl';
import { tokenAdapter } from './tokenAdapter/tokenAdapter';

/** Binds the shared API client to the mobile transport. The root layout calls
 * this once; the transport reads the session for each request. */
export function configureMobileApiClient(): void {
  configureApiClient(
    createTransport({
      baseUrl: apiBaseUrl(),
      client: 'mobile',
      adapter: tokenAdapter({
        readToken: () => mobileSession.accessToken(),
        renewToken: refused => mobileSession.renewAccessToken(refused)
      })
    })
  );
}
