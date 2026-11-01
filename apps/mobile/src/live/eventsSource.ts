import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  API_PREFIX
} from '../api/apiClient/ApiClient';
import { USER_AGENT, USER_AGENT_HEADER } from '../api/userAgent';
import type { ApiConfig } from '../auth/useApiConfig';
import type { LiveEventSource } from './liveEventStream/liveEventStream';

/** The one live stream, carrying the credential the edge reads. */
export function eventsSource(config: ApiConfig): LiveEventSource {
  return {
    uri: `${config.baseUrl.replace(/\/+$/, '')}${API_PREFIX}/events`,
    headers: {
      [ACCESS_TOKEN_ID_HEADER]: config.token.id,
      [ACCESS_TOKEN_HEADER]: config.token.secret,
      [USER_AGENT_HEADER]: USER_AGENT
    }
  };
}
