/** What the player should do with a track whose stream failed to load. */
export enum StreamFailureKind {
  /* Cannot be played: not found, forbidden, or no stored media. */
  Gone = 'gone',
  /* The session expired; the client is re-authenticating, not a track fault. */
  Session = 'session',
  /* Failed for a reason this client cannot classify; leave the track. */
  Unknown = 'unknown'
}

export const STREAM_SESSION_STATUS = 401;

/* The statuses that say an entry will never play: 404 (unseen or pruned), 403
 * (a definitive refusal) and 409 (no stored media). */
export function isGoneStreamStatus(status: number): boolean {
  return status === 403 || status === 404 || status === 409;
}

export function streamFailureKind(status: number): StreamFailureKind {
  if (status === STREAM_SESSION_STATUS) {
    return StreamFailureKind.Session;
  }

  return isGoneStreamStatus(status)
    ? StreamFailureKind.Gone
    : StreamFailureKind.Unknown;
}
