import { configureApiClient, createTransport } from '@playliberty/api-client';

import { mobileSession } from '../auth/session/session';
import { apiBaseUrl } from './apiBaseUrl';
import { tokenAdapter } from './tokenAdapter/tokenAdapter';

/** The one client every read and command goes through. */
export const apiClient = createTransport({
  baseUrl: apiBaseUrl(),
  client: 'mobile',
  adapter: tokenAdapter({
    readToken: () => mobileSession.accessToken(),
    renewToken: refused => mobileSession.renewAccessToken(refused)
  })
});

configureApiClient(apiClient);
