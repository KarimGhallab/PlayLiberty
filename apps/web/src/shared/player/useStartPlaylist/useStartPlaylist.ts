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
 * The playlist-start action, in one place because three controls draw it. A
 * press acts on the playlist pressed, not the current queue; a refusal is
 * returned, not drawn, so the screen owns its notice.
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

      /* Already this playlist's queue: play pauses/resumes, shuffle toggles
       * the mode; neither rebuilds the queue. */
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
   * The notice withdraws itself so it cannot stand over the library; the window
   * is the action's, the notice only its surface.
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
 * The refusal in words: one sentence and a line, naming the playlist and why
 * the press did nothing. The action's copy, shared by play and shuffle.
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
