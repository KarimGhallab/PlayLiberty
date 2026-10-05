import { LiveEventType } from '@playliberty/contracts';

import { playlistAudience, trackAudience } from '../access/playlistAccess.js';
import type { AppContext } from '../context.js';

/*
 * The live events this server emits, in one place, so a feature says what changed
 * rather than restating the audience rule. An event names what changed and the
 * client refetches; the audience is the same access rule that decides who may see
 * the playlist, so a listener and a publisher cannot disagree about who is told.
 *
 * The context is narrowed to the two things a publisher needs, so the download
 * worker can publish without carrying the whole app.
 */

type LiveEventContext = Pick<AppContext, 'database' | 'events'>;

/** A playlist was created, renamed, or had a setting changed. */
export function publishPlaylistChanged(
  context: LiveEventContext,
  playlistId: string
): void {
  context.events.publish(
    { type: LiveEventType.PlaylistChanged, playlistId },
    playlistAudience(context.database, playlistId)
  );
}

/*
 * A playlist was deleted. The audience is passed in because it has to be read
 * before the row is gone; the route captures it, deletes, then publishes.
 */
export function publishPlaylistRemoved(
  context: LiveEventContext,
  playlistId: string,
  accountIds: string[]
): void {
  context.events.publish(
    { type: LiveEventType.PlaylistRemoved, playlistId },
    accountIds
  );
}

/** A track's file changed, so every playlist that holds it hears. */
export function publishTrackChanged(
  context: LiveEventContext,
  trackId: string
): void {
  const audience = trackAudience(context.database, trackId);

  if (audience.playlistIds.length === 0) {
    return;
  }

  context.events.publish(
    { type: LiveEventType.TrackChanged, playlistIds: audience.playlistIds },
    audience.accountIds
  );
}

/*
 * A track's association changed, so the named playlists hear whether or not the
 * track is still in them. This is the removal's shape: the track outlives the
 * association, and the playlist it left is exactly the one whose list and count
 * moved.
 */
export function publishTracksChangedForPlaylists(
  context: LiveEventContext,
  playlistIds: string[]
): void {
  if (playlistIds.length === 0) {
    return;
  }

  const accountIds = new Set<string>();

  for (const playlistId of playlistIds) {
    for (const accountId of playlistAudience(context.database, playlistId)) {
      accountIds.add(accountId);
    }
  }

  context.events.publish({ type: LiveEventType.TrackChanged, playlistIds }, [
    ...accountIds
  ]);
}
