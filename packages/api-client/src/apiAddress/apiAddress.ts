import {
  ACCESS_TOKEN_HEADER,
  ACCESS_TOKEN_ID_HEADER,
  API_PREFIX,
  USER_AGENT_HEADER
} from '../protocol.js';

export interface AccessToken {
  readonly id: string;
  readonly secret: string;
}

/** The absolute API address a client-side element reads, with one slash join. */
export function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${API_PREFIX}${path}`;
}

/** The credential the edge reads beside an address. */
export function accessHeaders(
  token: AccessToken,
  userAgent: string
): Record<string, string> {
  return {
    [ACCESS_TOKEN_ID_HEADER]: token.id,
    [ACCESS_TOKEN_HEADER]: token.secret,
    [USER_AGENT_HEADER]: userAgent
  };
}
