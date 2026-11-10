import type {
  TransportAdapter,
  TransportRequest
} from '@playliberty/api-client';

import type { AccessToken } from '../credentialed/credentialed';
import {
  NeedsProvisioningError,
  credentialHeaders
} from '../credentialed/credentialed';

export interface TokenAdapterOptions {
  readonly readToken: () => Promise<AccessToken | null>;
  readonly renewToken: (refused: AccessToken) => Promise<AccessToken | null>;
}

function attempt(
  token: AccessToken,
  request: TransportRequest
): Promise<Response> {
  const headers = new Headers(request.init.headers);

  for (const [name, value] of Object.entries(credentialHeaders(token))) {
    headers.set(name, value);
  }

  return fetch(request.url, { ...request.init, headers });
}

export function tokenAdapter(options: TokenAdapterOptions): TransportAdapter {
  return {
    async send(request) {
      const token = await options.readToken();

      if (token === null) {
        throw new NeedsProvisioningError();
      }

      const response = await attempt(token, request);

      if (response.status !== 401) {
        return response;
      }

      const renewed = await options.renewToken(token);

      if (renewed === null) {
        throw new NeedsProvisioningError();
      }

      return attempt(renewed, request);
    }
  };
}
