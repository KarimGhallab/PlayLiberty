import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  ApiError,
  type TransportAdapter,
  type TransportRequest,
  USER_AGENT_HEADER
} from '@playliberty/api-client';

import { USER_AGENT } from '../userAgent';

export interface AccessToken {
  readonly id: string;
  readonly secret: string;
}

export interface TokenAdapterOptions {
  readonly readToken: () => Promise<AccessToken | null>;
  readonly renewToken: (refused: AccessToken) => Promise<AccessToken | null>;
}

export class NeedsProvisioningError extends ApiError {
  constructor() {
    super(401, null);
    this.name = 'NeedsProvisioningError';
  }
}

function attempt(
  token: AccessToken,
  request: TransportRequest
): Promise<Response> {
  const headers = new Headers(request.init.headers);
  headers.set(ACCESS_TOKEN_ID_HEADER, token.id);
  headers.set(ACCESS_TOKEN_HEADER, token.secret);
  headers.set(USER_AGENT_HEADER, USER_AGENT);

  return fetch(request.url, { ...request.init, headers });
}

/* The token half of the transport: one renewal and one retry on a `401`, and
 * a provisioning error when the session has ended. */
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
