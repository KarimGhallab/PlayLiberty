import type { ApiMediaEndpoint, EndpointParams } from '@playliberty/contracts';
import { endpointPath } from '@playliberty/contracts';

import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  API_PREFIX
} from '../../api/apiClient/ApiClient';
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
    uri: `${config.baseUrl.replace(/\/+$/, '')}${API_PREFIX}${endpointPath(
      endpoint.path,
      params
    )}`,
    headers: {
      [ACCESS_TOKEN_ID_HEADER]: config.token.id,
      [ACCESS_TOKEN_HEADER]: config.token.secret
    }
  };
}
