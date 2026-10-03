import { IconLock, IconLockShare, IconUserShare } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import type { Playlist } from '@playliberty/contracts';
import {
  formatLastSynced,
  syncStateLabel,
  trackCountUnit
} from '@playliberty/ui-foundation';

import styles from './PlaylistHeader.module.scss';

/*
 * The playlist header: the cover, the name, the share indicator, the count and
 * the sync line. It is the library's item and the playlist detail's header, one
 * component at two arrangements, so no screen draws a second item that resembles
 * it. The actions column (play, shuffle, overflow) is not here; it arrives with
 * the player, and this ticket owns the identity block the list needs.
 *
 * The cover and the name both link to the playlist. The cover's link carries
 * `aria-hidden` and `tabindex="-1"` so a reader announces one link per item, the
 * name carrying the label, rather than two links to one destination.
 *
 * `ownerName` is the resolved display name of a playlist that is not the
 * account's, and null when the directory does not carry the owner. It is drawn
 * only for a shared playlist: on the account's own playlist `access` is `owner`,
 * which already says the item is theirs, so a "shared by" line there would be a
 * sentence about the person reading it. A null name draws nothing at all rather
 * than a placeholder, because a placeholder reads as a decision about who owns
 * the playlist, and the share indicator beside the name is the honest fallback.
 */

interface PlaylistHeaderProps {
  playlist: Playlist;
  ownerName?: string | null;
}

interface ShareMark {
  readonly state: 'own-private' | 'own-shared' | 'collab';
  readonly label: string;
  readonly Icon: typeof IconLock;
}

/*
 * Three share states and one glyph each. The indicator is coarser than the
 * permission model on purpose: one glyph says you are not the owner and nothing
 * about what you may do, because the level is shown where it acts, in the
 * overflow.
 */
function shareMark(playlist: Playlist): ShareMark {
  if (playlist.access !== 'owner') {
    return {
      state: 'collab',
      label: 'You are a collaborator',
      Icon: IconUserShare
    };
  }

  if (playlist.hasShares) {
    return {
      state: 'own-shared',
      label: 'Shared playlist',
      Icon: IconLockShare
    };
  }

  return { state: 'own-private', label: 'Private playlist', Icon: IconLock };
}

export default function PlaylistHeader({
  playlist,
  ownerName = null
}: PlaylistHeaderProps) {
  const mark = shareMark(playlist);
  const lastSyncedAt =
    playlist.lastSyncedAt === null ? null : new Date(playlist.lastSyncedAt);
  const now = new Date();
  const sharedBy =
    playlist.access !== 'owner' && ownerName !== null ? ownerName : null;

  return (
    <div className={styles.playlistHeader}>
      <Link
        to="/playlists/$playlistId"
        params={{ playlistId: playlist.id }}
        className={styles.playlistHeader__cover}
        aria-hidden="true"
        tabIndex={-1}
        data-art={playlist.coverUrl === null ? 'no-art' : 'art'}>
        {playlist.coverUrl === null ? null : (
          <img
            className={styles.playlistHeader__art}
            src={playlist.coverUrl}
            alt=""
          />
        )}
      </Link>
      <div className={styles.playlistHeader__body}>
        <div className={styles.playlistHeader__name}>
          <Link
            to="/playlists/$playlistId"
            params={{ playlistId: playlist.id }}
            className={styles.playlistHeader__nameText}>
            {playlist.name}
          </Link>
          <span
            className={styles.playlistHeader__share}
            data-share={mark.state}
            role="img"
            aria-label={mark.label}>
            <mark.Icon
              className={styles.playlistHeader__shareIcon}
              aria-hidden="true"
              focusable="false"
            />
            <span
              className={styles.playlistHeader__shareTip}
              role="presentation">
              {mark.label}
            </span>
          </span>
        </div>
        <div className={styles.playlistHeader__meta}>
          <span
            className={styles.playlistHeader__state}
            data-state={playlist.syncStatus}>
            {syncStateLabel(playlist.syncStatus)}
          </span>
          <span className={styles.playlistHeader__sep} aria-hidden="true">
            &middot;
          </span>
          <span>{formatLastSynced(lastSyncedAt, now)}</span>
        </div>
        {sharedBy === null ? null : (
          <p className={styles.playlistHeader__owner}>Shared by {sharedBy}</p>
        )}
        <div className={styles.playlistHeader__count}>
          <span>{playlist.trackCount}</span>
          <span className={styles.playlistHeader__countUnit}>
            {trackCountUnit(playlist.trackCount)}
          </span>
        </div>
      </div>
    </div>
  );
}
