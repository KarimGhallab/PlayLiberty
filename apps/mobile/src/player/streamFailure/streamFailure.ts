import { streamSource } from '../../api/streamSource';
import type { ApiConfig } from '../../auth/useApiConfig';

/* What the player should do about a stream that failed to load. The player
 * cannot say why, so the route's status becomes one of three answers. */
export enum StreamFailureKind {
  /* The stored file is gone; drop the entry and continue. */
  Gone = 'gone',
  /* The session expired; this is not a broken track. */
  Session = 'session',
  /* Anything else; pause and explain rather than skipping a playable track. */
  Unknown = 'unknown'
}

export type StreamFailureClassifier = (
  trackId: string
) => Promise<StreamFailureKind>;

const GONE_STATUS = 404;
const SESSION_STATUS = 401;

/*
 * A load failure is classified by re-asking the stream route. Only a definitive
 * `404` drops the entry; a `401` belongs to the shell; everything else leaves
 * the track where it is so the listener can try again.
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

    if (response.status === GONE_STATUS) {
      return StreamFailureKind.Gone;
    }

    if (response.status === SESSION_STATUS) {
      return StreamFailureKind.Session;
    }

    return StreamFailureKind.Unknown;
  } catch {
    return StreamFailureKind.Unknown;
  }
}
