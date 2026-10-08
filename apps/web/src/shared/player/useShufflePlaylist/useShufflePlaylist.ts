import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import type { Playlist, PlaylistTrack } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';

import {
  fetchPlaylistTracks,
  playlistTracksKey
} from '../../api/queries/queries';
import { startPlaylistQueue } from '../playerQueue/playerQueue';
import { usePlayerStore } from '../playerStore/playerStore';
import { queuePlaylistId } from '../types';

/*
 * The shuffle control's action, in one place because two surfaces draw the same
 * control: the library gives every item one, and the detail's header draws one for
 * the playlist it shows. Shuffle is a property of playback, so the control is not
 * a flag on a row: pressing it starts the playlist it was pressed on, shuffled,
 * whether the queue was empty, another playlist's, or this one already.
 *
 * Only the tracks read knows whether a playlist has anything to play, and the
 * queue may belong to another playlist, so a press can be refused. The refusal is
 * returned rather than drawn here, so each screen puts it in the notice slot it
 * already owns.
 */

/** How long a refusal stands before it withdraws itself. */
export const NOTICE_WINDOW_MS = 4000;

export interface ShuffleRefusal {
  readonly name: string;
  readonly reason: 'empty' | 'unreachable';
}

export interface ShuffleControl {
  readonly shufflePlaylist: (playlist: Pick<Playlist, 'id' | 'name'>) => void;
  readonly refusal: ShuffleRefusal | null;
}

export function useShufflePlaylist(): ShuffleControl {
  const queryClient = useQueryClient();
  const [refusal, setRefusal] = useState<ShuffleRefusal | null>(null);

  const shufflePlaylist = useCallback(
    (playlist: Pick<Playlist, 'id' | 'name'>) => {
      const player = usePlayerStore.getState();

      if (queuePlaylistId(player) === playlist.id) {
        /*
         * The queue is already this playlist's, so the press changes the mode and
         * nothing else. Turning it on resumes as well, because reaching for
         * shuffle is a play gesture like the transport's; turning it off restores
         * the playlist's own order and leaves the transport where it is.
         */
        if (player.shuffle) {
          player.setShuffle(false);
        } else {
          player.setShuffle(true);
          player.setPlaying(true);
        }

        return;
      }

      void (async () => {
        let tracks: PlaylistTrack[];

        try {
          tracks = await queryClient.query({
            queryKey: playlistTracksKey(playlist.id),
            queryFn: () => fetchPlaylistTracks(playlist.id)
          });
        } catch {
          setRefusal({ name: playlist.name, reason: 'unreachable' });
          return;
        }

        const started = startPlaylistQueue(playlist, tracks, null, true);

        if (!started) {
          setRefusal({ name: playlist.name, reason: 'empty' });
        }
      })();
    },
    [queryClient]
  );

  /*
   * The notice withdraws itself, so it cannot stand over the library once it has
   * been read. The window lives here rather than in the notice, because it is the
   * action's and the notice is only its surface.
   */
  useEffect(() => {
    if (refusal === null) {
      return;
    }

    const timer = setTimeout(() => setRefusal(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [refusal]);

  return { shufflePlaylist, refusal };
}

/*
 * The refusal in words: one sentence and one line under it, naming the playlist
 * and saying why the press did nothing. Both screens draw the same notice, so the
 * wording lives with the action rather than in either of them.
 */
export function refusalNotice(
  refusal: ShuffleRefusal,
  t: Translator<Messages>
): {
  message: string;
  detail: string;
} {
  if (refusal.reason === 'unreachable') {
    return {
      message: t('shuffle.unreachable', { name: refusal.name }),
      detail: t('shuffle.unreachableDetail')
    };
  }

  return {
    message: t('shuffle.empty', { name: refusal.name }),
    detail: t('shuffle.emptyDetail')
  };
}
