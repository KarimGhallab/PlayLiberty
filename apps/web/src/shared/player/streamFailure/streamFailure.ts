import { endpoints } from '@playliberty/contracts';

import { ApiError, probeStreamStatus } from '../../api/client/client';
import { mediaPath } from '../../api/endpoints/endpoints';

/*
 * What to do about a stream that failed to load. The element cannot say why, so
 * the route's status becomes one of three answers: gone is dropped, an expired
 * session is not a track fault, anything else is left alone.
 */

/** What the player should do with the current track. */
export enum StreamFailureKind {
  /* Cannot be played: not found, forbidden, or no stored media. */
  Gone = 'gone',
  /* The session expired; the client is re-authenticating, not a track fault. */
  Session = 'session',
  /* Failed for a reason this client cannot classify; leave the track. */
  Unknown = 'unknown'
}

/*
 * The statuses that say an entry will never play: 404 (unseen or pruned), 403,
 * 409 (no stored media); each is definitive, so dropping the entry is honest.
 */
const GONE_STATUSES = new Set([403, 404, 409]);

/** The path the stream is read from, relative to the API prefix `send` adds. */
function streamPath(trackId: string): string {
  return mediaPath(endpoints.trackStream, { trackId });
}

/*
 * Classify a load failure by re-asking the route. The probe runs through the
 * client's path, so a thrown `401` is the session answer, else unknown.
 */
export async function classifyStreamFailure(
  trackId: string
): Promise<StreamFailureKind> {
  try {
    const status = await probeStreamStatus(streamPath(trackId));

    return GONE_STATUSES.has(status)
      ? StreamFailureKind.Gone
      : StreamFailureKind.Unknown;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return StreamFailureKind.Session;
    }

    return StreamFailureKind.Unknown;
  }
}
