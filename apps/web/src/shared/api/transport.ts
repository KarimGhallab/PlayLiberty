import { configureApiClient, createTransport } from '@playliberty/api-client';

import { cookieAdapter } from './cookieAdapter/cookieAdapter';

/** The one transport the web app speaks through; cookies are the credential. */
export const transport = createTransport({
  client: 'web',
  adapter: cookieAdapter()
});

configureApiClient(transport);
