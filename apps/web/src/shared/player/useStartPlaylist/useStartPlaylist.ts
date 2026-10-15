import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import type { Playlist, PlaylistTrack } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';

import {
  fetchPlaylistQueue,
  playlistQueueKey
} from '../../api/queries/queries';
import { startPlaylistQueue } from '../playerQueue/playerQueue';
import { usePlayerStore } from '../playerStore/playerStore';
import { queuePlaylistId } from '../types';

/*
 * The playlist-start action, in one place because three controls draw it: the
 * library gives every item a shuffle and a play at phone width, and the detail's
 * header draws both for the playlist it shows. Whether the queue was empty,
 * another playlist's, or this one already, the press acts on the playlist it was
 * pressed on rather than on the queue.
 *
 * When the queue is already this playlist's, neither control starts anything: the
 * play pauses and resumes it and the shuffle turns the mode over, which are the
 * store's own rules and what makes the two controls over playback rather than
 * over the list.
 *
 * The read is the playlist's whole association list, not a page, so the queue
 * covers the playlist rather than its first page.
 *
 * Only the queue read knows whether a playlist has anything to play, and the
 * queue may belong to another playlist, so a press can be refused. The refusal is
 * returned rather than drawn here, so each screen puts it in the notice slot it
 * already owns; the unreachable case is optionally handed back instead, because
 * the detail's header owns that failure on its own play control.
 */

/** How long a refusal stands before it withdraws itself. */
export const NOTICE_WINDOW_MS = 4000;

export interface StartRefusal {
  readonly name: string;
  readonly reason: 'empty' | 'unreachable';
}

export interface StartOptions {
  readonly onUnreachable?: () => void;
}

export interface PlaylistStartControl {
  /* Start the playlist in its own order, or pause and resume the queue that is
   * already its own. */
  readonly playPlaylist: (playlist: Pick<Playlist, 'id' | 'name'>) => void;
  /* Start it shuffled, or turn the mode over. */
  readonly shufflePlaylist: (
    playlist: Pick<Playlist, 'id' | 'name'>,
    options?: StartOptions
  ) => void;
  readonly refusal: StartRefusal | null;
}

export function useStartPlaylist(): PlaylistStartControl {
  const queryClient = useQueryClient();
  const [refusal, setRefusal] = useState<StartRefusal | null>(null);

  const start = useCallback(
    (
      playlist: Pick<Playlist, 'id' | 'name'>,
      mode: 'play' | 'shuffle',
      options: StartOptions = {}
    ) => {
      const player = usePlayerStore.getState();

      if (queuePlaylistId(player) === playlist.id) {
        if (mode === 'shuffle') {
          player.setShuffle(!player.shuffle);
          return;
        }

        player.setPlaying(!player.isPlaying);
        return;
      }

      void (async () => {
        let tracks: PlaylistTrack[];

        try {
          tracks = await queryClient.query({
            queryKey: playlistQueueKey(playlist.id),
            queryFn: () => fetchPlaylistQueue(playlist.id)
          });
        } catch {
          if (options.onUnreachable !== undefined) {
            options.onUnreachable();
            return;
          }

          setRefusal({ name: playlist.name, reason: 'unreachable' });
          return;
        }

        const started = startPlaylistQueue(
          playlist,
          tracks,
          null,
          mode === 'shuffle'
        );

        if (!started) {
          setRefusal({ name: playlist.name, reason: 'empty' });
        }
      })();
    },
    [queryClient]
  );

  const playPlaylist = useCallback(
    (playlist: Pick<Playlist, 'id' | 'name'>) => start(playlist, 'play'),
    [start]
  );

  const shufflePlaylist = useCallback(
    (playlist: Pick<Playlist, 'id' | 'name'>, options?: StartOptions): void =>
      start(playlist, 'shuffle', options),
    [start]
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

  return { playPlaylist, shufflePlaylist, refusal };
}

/*
 * The refusal in words: one sentence and one line under it, naming the playlist
 * and saying why the press did nothing. It is the action's copy rather than
 * either control's, because a play and a shuffle refuse for the same two
 * reasons and say the same thing.
 */
export function refusalNotice(
  refusal: StartRefusal,
  t: Translator<Messages>
): {
  message: string;
  detail: string;
} {
  if (refusal.reason === 'unreachable') {
    return {
      message: t('start.unreachable', { name: refusal.name }),
      detail: t('start.unreachableDetail')
    };
  }

  return {
    message: t('start.empty', { name: refusal.name }),
    detail: t('start.emptyDetail')
  };
}
