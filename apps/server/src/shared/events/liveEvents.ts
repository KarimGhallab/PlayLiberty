import { LiveEventType } from '@playliberty/contracts';

import { playlistAudience, trackAudience } from '../access/playlistAccess.js';
import type { AppContext } from '../context.js';
import { exhaust } from '../exhaust.js';

/*
 * The live events this server emits, in one place: an event names what changed
 * and the client refetches. The audience is the same access rule that decides
 * who may see the playlist. The context is narrowed to what a publisher needs.
 */

export type LiveEventContext = Pick<AppContext, 'database' | 'events'>;

/* What a commit changed, stated by the module that wrote it. */
export enum ChangeKind {
  PlaylistChanged = 'playlist_changed',
  PlaylistRemoved = 'playlist_removed',
  TrackChanged = 'track_changed',
  TracksChangedForPlaylists = 'tracks_changed_for_playlists'
}

export type Change =
  | { kind: ChangeKind.PlaylistChanged; playlistId: string }
  | {
      kind: ChangeKind.PlaylistRemoved;
      playlistId: string;
      accountIds: string[];
    }
  | { kind: ChangeKind.TrackChanged; trackId: string }
  | { kind: ChangeKind.TracksChangedForPlaylists; playlistIds: string[] };

export function publishPlaylistChanged(
  context: LiveEventContext,
  playlistId: string
): void {
  context.events.publish(
    { type: LiveEventType.PlaylistChanged, playlistId },
    playlistAudience(context.database, playlistId)
  );
}

/* The audience is passed in: it must be read before the row is gone. */
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

export function publishTrackChanged(
  context: LiveEventContext,
  trackId: string
): void {
  const trackAudiences = trackAudience(context.database, trackId);
  for (const { accountId, playlistIds } of trackAudiences) {
    context.events.publish({ type: LiveEventType.TrackChanged, playlistIds }, [
      accountId
    ]);
  }
}

/* A track's association changed, so the named playlists hear whether or not the
 * track is still in them. Per recipient, only what it can reach is named. */
export function publishTracksChangedForPlaylists(
  context: LiveEventContext,
  playlistIds: string[]
): void {
  const byAccount = new Map<string, string[]>();

  for (const playlistId of playlistIds) {
    for (const accountId of playlistAudience(context.database, playlistId)) {
      const ids = byAccount.get(accountId) ?? [];
      ids.push(playlistId);
      byAccount.set(accountId, ids);
    }
  }

  for (const [accountId, ids] of byAccount) {
    context.events.publish(
      { type: LiveEventType.TrackChanged, playlistIds: ids },
      [accountId]
    );
  }
}

/* The one seam from a committed change to its event: the committing module
 * names what changed, this names who hears it. */
export function announce(context: LiveEventContext, change: Change): void {
  if (change.kind === ChangeKind.PlaylistChanged) {
    publishPlaylistChanged(context, change.playlistId);
  } else if (change.kind === ChangeKind.PlaylistRemoved) {
    publishPlaylistRemoved(context, change.playlistId, change.accountIds);
  } else if (change.kind === ChangeKind.TrackChanged) {
    publishTrackChanged(context, change.trackId);
  } else if (change.kind === ChangeKind.TracksChangedForPlaylists) {
    publishTracksChangedForPlaylists(context, change.playlistIds);
  } else {
    exhaust(change);
  }
}
