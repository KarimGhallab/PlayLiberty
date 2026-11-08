import { accessHeaders, apiUrl } from '@playliberty/api-client';
import type { ApiMediaEndpoint, EndpointParams } from '@playliberty/contracts';
import { endpointPath } from '@playliberty/contracts';

import { USER_AGENT } from '../../api/userAgent';
import type { ApiConfig } from '../../auth/useApiConfig';

export interface MediaSource {
  readonly uri: string;
  readonly headers: Record<string, string>;
}

/** The address and credential a media element reads an API media route with. */
export function mediaSource(
  config: ApiConfig,
  endpoint: ApiMediaEndpoint,
  params: EndpointParams
): MediaSource {
  return {
    uri: apiUrl(config.baseUrl, endpointPath(endpoint.path, params)),
    headers: accessHeaders(config.token, USER_AGENT)
  };
}
