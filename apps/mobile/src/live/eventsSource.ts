import { accessHeaders, apiUrl } from '@playliberty/api-client';

import { USER_AGENT } from '../api/userAgent';
import type { ApiConfig } from '../auth/useApiConfig';
import type { LiveEventSource } from './liveEventStream/liveEventStream';

/** The one live stream, carrying the credential the edge reads. */
export function eventsSource(config: ApiConfig): LiveEventSource {
  return {
    uri: apiUrl(config.baseUrl, '/events'),
    headers: accessHeaders(config.token, USER_AGENT)
  };
}
