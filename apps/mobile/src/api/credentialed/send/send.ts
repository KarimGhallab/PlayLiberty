import { mobileSession } from '../../../auth/session/session';
import type { AccessToken, CredentialedConfig } from '../credentialed';
import { NeedsProvisioningError, credentialedAddress } from '../credentialed';

export type RenewAccessToken = (
  refused: AccessToken
) => Promise<AccessToken | null>;

export interface CredentialedResponse {
  readonly response: Response;
  /** The pair a refused request was retried with, or null. */
  readonly renewed: AccessToken | null;
}

async function send(
  config: CredentialedConfig,
  path: string,
  token: AccessToken,
  init: RequestInit
): Promise<Response> {
  const address = credentialedAddress({ ...config, token }, path);
  const headers = new Headers(init.headers);

  for (const [name, value] of Object.entries(address.headers)) {
    headers.set(name, value);
  }

  return fetch(address.uri, { ...init, headers });
}

/* One refusal, one renewal, one retry. The renewal is the session's shared
 * flight, and a null answer is the provisioning verdict. */
export async function sendCredentialed(
  config: CredentialedConfig,
  path: string,
  init: RequestInit = {},
  renew: RenewAccessToken = refused => mobileSession.renewAccessToken(refused)
): Promise<CredentialedResponse> {
  const first = await send(config, path, config.token, init);

  if (first.status !== 401) {
    return { response: first, renewed: null };
  }

  const renewed = await renew(config.token);

  if (renewed === null) {
    throw new NeedsProvisioningError();
  }

  const retry = await send(config, path, renewed, init);

  return { response: retry, renewed };
}
