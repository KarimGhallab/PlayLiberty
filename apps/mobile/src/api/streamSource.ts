import { accessHeaders, apiUrl } from '@playliberty/api-client';
import { endpointPath, endpoints } from '@playliberty/contracts';

import type { AccessToken } from './tokenAdapter/tokenAdapter';
import { USER_AGENT } from './userAgent';

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
    uri: apiUrl(baseUrl, path),
    headers: accessHeaders(token, USER_AGENT)
  };
}
