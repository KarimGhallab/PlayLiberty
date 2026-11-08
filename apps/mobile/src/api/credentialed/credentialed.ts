import { ApiError, accessHeaders, apiUrl } from '@playliberty/api-client';
import type { ApiMediaEndpoint, EndpointParams } from '@playliberty/contracts';
import { endpointPath, endpoints } from '@playliberty/contracts';

import { USER_AGENT } from '../userAgent';

export interface AccessToken {
  readonly id: string;
  readonly secret: string;
}

export interface CredentialedConfig {
  readonly baseUrl: string;
  readonly token: AccessToken;
}

export interface CredentialedAddress {
  readonly uri: string;
  readonly headers: Record<string, string>;
}

/** The credential headers the edge reads beside an address. */
export function credentialHeaders(token: AccessToken): Record<string, string> {
  return accessHeaders(token, USER_AGENT);
}

/** The one place an address and its access pair are joined. */
export function credentialedAddress(
  config: CredentialedConfig,
  path: string
): CredentialedAddress {
  return {
    uri: apiUrl(config.baseUrl, path),
    headers: credentialHeaders(config.token)
  };
}

export function streamAddress(
  config: CredentialedConfig,
  trackId: string
): CredentialedAddress {
  return credentialedAddress(
    config,
    endpointPath(endpoints.trackStream.path, { trackId })
  );
}

export function mediaAddress(
  config: CredentialedConfig,
  endpoint: ApiMediaEndpoint,
  params: EndpointParams
): CredentialedAddress {
  return credentialedAddress(config, endpointPath(endpoint.path, params));
}

export function eventsAddress(config: CredentialedConfig): CredentialedAddress {
  return credentialedAddress(config, '/events');
}

/** The credential the app no longer holds, so the shell must sign out. */
export class NeedsProvisioningError extends ApiError {
  constructor() {
    super(401, null);
    this.name = 'NeedsProvisioningError';
  }
}
