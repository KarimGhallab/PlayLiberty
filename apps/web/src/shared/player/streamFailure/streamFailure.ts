import { ApiError } from '@playliberty/api-client';
import { endpoints } from '@playliberty/contracts';
import {
  StreamFailureKind,
  streamFailureKind
} from '@playliberty/ui-foundation';

import { mediaPath } from '../../api/endpoints/endpoints';
import { transport } from '../../api/transport';

/*
 * What to do about a stream that failed to load. The element cannot say why, so
 * the route's status becomes one of three answers: gone is dropped, an expired
 * session is not a track fault, anything else is left alone.
 */

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
    const status = await transport.probe(streamPath(trackId));

    return streamFailureKind(status);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return StreamFailureKind.Session;
    }

    return StreamFailureKind.Unknown;
  }
}
