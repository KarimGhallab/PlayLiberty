import {
  StreamFailureKind,
  streamFailureKind
} from '@playliberty/ui-foundation';

import { streamSource } from '../../api/streamSource';
import type { ApiConfig } from '../../auth/useApiConfig';

/* What the player should do about a stream that failed to load. The player
 * cannot say why, so the route's status becomes one of three answers. */
export type StreamFailureClassifier = (
  trackId: string
) => Promise<StreamFailureKind>;

/*
 * A load failure is classified by re-asking the stream route. The shared
 * verdict drops a definitive refusal, a missing file or a fileless entry; a
 * `401` belongs to the shell; everything else leaves the track where it is.
 */
export async function classifyStreamFailure(
  config: ApiConfig,
  trackId: string
): Promise<StreamFailureKind> {
  const source = streamSource(config.baseUrl, trackId, config.token);

  try {
    const response = await fetch(source.uri, {
      method: 'HEAD',
      headers: source.headers
    });

    return streamFailureKind(response.status);
  } catch {
    return StreamFailureKind.Unknown;
  }
}
