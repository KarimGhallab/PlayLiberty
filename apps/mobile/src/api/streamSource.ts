import { endpointPath, endpoints } from '@playliberty/contracts';

import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  API_PREFIX,
  type AccessToken
} from './apiClient/ApiClient';
import { USER_AGENT, USER_AGENT_HEADER } from './userAgent';

/** A stream address and the headers the edge expects beside it. */
export interface StreamSource {
  readonly uri: string;
  readonly headers: Record<string, string>;
}

export function streamSource(
  baseUrl: string,
  trackId: string,
  token: AccessToken
): StreamSource {
  const path = endpointPath(endpoints.trackStream.path, { trackId });

  return {
    uri: `${baseUrl.replace(/\/+$/, '')}${API_PREFIX}${path}`,
    headers: {
      [ACCESS_TOKEN_ID_HEADER]: token.id,
      [ACCESS_TOKEN_HEADER]: token.secret,
      [USER_AGENT_HEADER]: USER_AGENT
    }
  };
}
