import { endpointPath, endpoints } from '@playliberty/contracts';
import { isGoneStreamStatus } from '@playliberty/ui-foundation';

import type { AccessToken } from '../../api/credentialed/credentialed';
import { NeedsProvisioningError } from '../../api/credentialed/credentialed';
import { sendCredentialed } from '../../api/credentialed/send/send';
import type { ApiConfig } from '../../auth/useApiConfig/useApiConfig';

/* What the player does about a failed stream: retry reloads with the new pair,
 * session belongs to the shell, gone drops the track, unknown leaves it. */
export type StreamFailure =
  | { readonly kind: 'retry'; readonly token: AccessToken }
  | { readonly kind: 'gone' }
  | { readonly kind: 'session' }
  | { readonly kind: 'unknown' };

export type StreamFailureClassifier = (
  trackId: string
) => Promise<StreamFailure>;

/* A load failure is classified by re-asking the stream route through the one
 * credentialed request, which renews once on a 401 before the answer is read. */
export async function classifyStreamFailure(
  config: ApiConfig,
  trackId: string
): Promise<StreamFailure> {
  const path = endpointPath(endpoints.trackStream.path, { trackId });

  try {
    const { response, renewed } = await sendCredentialed(config, path, {
      method: 'HEAD'
    });

    if (renewed !== null && response.ok) {
      return { kind: 'retry', token: renewed };
    }

    if (response.status === 401) {
      return { kind: 'session' };
    }

    return isGoneStreamStatus(response.status)
      ? { kind: 'gone' }
      : { kind: 'unknown' };
  } catch (error) {
    if (error instanceof NeedsProvisioningError) {
      return { kind: 'session' };
    }

    return { kind: 'unknown' };
  }
}
