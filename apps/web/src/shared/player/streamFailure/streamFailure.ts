import { ApiError, probeStreamStatus } from '../../api/client/client';

/*
 * What the player does about a stream that failed to load.
 *
 * The audio element cannot say why it failed, so the player asks the route for
 * its status and turns that into one of three answers. The distinction is the
 * ticket's: an expired session is not a broken track, a track that is gone is
 * dropped and the queue moves on, and anything else is left alone because a
 * network blip must not skip music.
 */

/** What the player should do with the current track. */
export enum StreamFailureKind {
  /* The track cannot be played: not found, forbidden, or has no stored media. */
  Gone = 'gone',
  /* The session expired and the client is re-authenticating. Not a track fault. */
  Session = 'session',
  /* The request failed for a reason this client cannot classify. Leave the track. */
  Unknown = 'unknown'
}

/*
 * The statuses a stream route uses to say an entry will never play: `404` for a
 * track the account cannot see or that is pruned, `403` for one it may not
 * stream, and `409` for one whose media is not stored. Every one of them is a
 * definitive answer about this entry, which is what makes dropping it honest.
 */
const GONE_STATUSES = new Set([403, 404, 409]);

/** The path the stream is read from, relative to the API prefix `send` adds. */
function streamPath(trackId: string): string {
  return `/tracks/${trackId}/stream`;
}

/*
 * Classify a load failure by re-asking the stream route for its status. The
 * probe runs through the client's own request path, so a `401` or an opaque
 * redirect has already been handled by the re-authentication guard by the time
 * the rejection reaches here; that is why a thrown `ApiError` with a `401` is
 * the session answer and every other thrown error is unknown.
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
