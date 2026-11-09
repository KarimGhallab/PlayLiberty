import { configureApiClient, createTransport } from '@playliberty/api-client';

import { cookieAdapter } from './cookieAdapter/cookieAdapter';

/** The one transport the web app speaks through; cookies are the credential. */
export const transport = createTransport({
  client: 'web',
  adapter: cookieAdapter()
});

/** Binds the shared API client to the web transport. The app calls this once at
 * boot; tests call it in their setup. */
export function configureWebApiClient(): void {
  configureApiClient(transport);
}
