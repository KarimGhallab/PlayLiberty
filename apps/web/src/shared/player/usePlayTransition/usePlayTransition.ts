import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import {
  cancelPlaylistQueue,
  readPlaylistQueue
} from '@playliberty/api-client';
import type { Playlist } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';

import { startPlaylistQueue } from '../playerQueue/playerQueue';
import { usePlayerStore } from '../playerStore/playerStore';
import { queuePlaylistId } from '../types';

/*
 * The one play transition: a press either acts on the queue already loaded or
 * reads the whole list and starts a new one. A refusal is returned, never
 * drawn, so each screen keeps its own notice.
 */

/** How long a refusal stands before it withdraws itself. */
export const NOTICE_WINDOW_MS = 4000;

/** How long a queue read may stay unanswered before the press is a failure. */
export const QUEUE_READ_TIMEOUT_MS = 10_000;

export enum StartIntent {
  Play = 'play',
  Shuffle = 'shuffle'
}

export enum StartFailure {
  Empty = 'empty',
  Unreachable = 'unreachable'
}

export interface PlayTransitionRefusal {
  readonly name: string;
  readonly reason: StartFailure;
}

type PlaylistIdentity = Pick<Playlist, 'id' | 'name'>;

/* One press: which playlist, with which intent, and the track it names. */
export interface PlayPress {
  readonly playlist: PlaylistIdentity;
  readonly intent: StartIntent;
  readonly startTrackId: string | null;
}

export interface PlayTransition {
  /* Start the playlist in its own order, or toggle the queue that is already
   * its own. */
  readonly play: (playlist: PlaylistIdentity) => void;
  /* Start it shuffled, or turn the mode over. */
  readonly shuffle: (playlist: PlaylistIdentity) => void;
  /* Move the playhead inside the loaded queue, or start this playlist on the
   * pressed track. */
  readonly playTrack: (playlist: PlaylistIdentity, trackId: string) => void;
  /* Re-run the press that failed, with the intent it was made with. */
  readonly retry: () => void;
  /* Whether a press is waiting on its read. */
  readonly starting: boolean;
  /* The press waiting on its read, so the control that was pressed can say so. */
  readonly startingPress: PlayPress | null;
  /* Whether the last press failed in a way a retry can answer. */
  readonly retryable: boolean;
  readonly refusal: PlayTransitionRefusal | null;
}

export interface PlayTransitionOptions {
  /** The read's deadline; the default is the production one. */
  readonly timeoutMs?: number;
}

/** The press when it names this playlist; null for another playlist or none. */
export function pressForPlaylist(
  press: PlayPress | null,
  playlistId: string
): PlayPress | null {
  return press !== null && press.playlist.id === playlistId ? press : null;
}

/* A read that never answers is a failed start after the deadline, not a
 * control that stays dimmed forever. */
function readWithin<T>(read: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('The queue read timed out.')),
      timeoutMs
    );

    read.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function usePlayTransition({
  timeoutMs = QUEUE_READ_TIMEOUT_MS
}: PlayTransitionOptions = {}): PlayTransition {
  const queryClient = useQueryClient();
  const [refusal, setRefusal] = useState<PlayTransitionRefusal | null>(null);
  const [pressInFlight, setPressInFlight] = useState<PlayPress | null>(null);
  const [failed, setFailed] = useState<PlayPress | null>(null);

  const load = useCallback(
    (press: PlayPress, retrying = false) => {
      setPressInFlight(press);
      if (!retrying) {
        setFailed(null);
      }

      void (async () => {
        try {
          const tracks = await readWithin(
            readPlaylistQueue(queryClient, press.playlist.id),
            timeoutMs
          );

          const started = startPlaylistQueue(
            press.playlist,
            tracks,
            press.startTrackId,
            press.intent === StartIntent.Shuffle
          );

          /* A read that answered is no longer a failure, whether it found a
           * queue or an empty playlist. */
          setFailed(null);

          if (!started) {
            setRefusal({
              name: press.playlist.name,
              reason: StartFailure.Empty
            });
          }
        } catch {
          /* A timed-out read is still the query's in-flight one; cancel it so
           * the retry asks the queue again rather than joining the hung read. */
          await cancelPlaylistQueue(queryClient, press.playlist.id);

          setRefusal({
            name: press.playlist.name,
            reason: StartFailure.Unreachable
          });
          setFailed(press);
        } finally {
          setPressInFlight(null);
        }
      })();
    },
    [queryClient, timeoutMs]
  );

  const start = useCallback(
    (
      playlist: PlaylistIdentity,
      intent: StartIntent,
      startTrackId: string | null
    ) => {
      const player = usePlayerStore.getState();

      /* This playlist's queue is loaded: the press acts on it and never
       * rebuilds it. */
      if (queuePlaylistId(player) === playlist.id) {
        if (intent === StartIntent.Shuffle) {
          player.setShuffle(!player.shuffle);
          return;
        }

        if (startTrackId === null || startTrackId === player.currentId) {
          player.setPlaying(!player.isPlaying);
          return;
        }

        player.play(startTrackId);
        return;
      }

      setRefusal(null);
      load({ playlist, intent, startTrackId });
    },
    [load]
  );

  const play = useCallback(
    (playlist: PlaylistIdentity) => start(playlist, StartIntent.Play, null),
    [start]
  );
  const shuffle = useCallback(
    (playlist: PlaylistIdentity) => start(playlist, StartIntent.Shuffle, null),
    [start]
  );
  const playTrack = useCallback(
    (playlist: PlaylistIdentity, trackId: string) =>
      start(playlist, StartIntent.Play, trackId),
    [start]
  );
  const retry = useCallback(() => {
    if (failed !== null) {
      /* The failure stays drawn while the retry is read, so the control says
       * "Retrying..." rather than vanishing. */
      setRefusal(null);
      load(failed, true);
    }
  }, [failed, load]);

  /* The notice withdraws itself so it cannot stand over the screen; the window
   * is the action's, the notice only its surface. */
  useEffect(() => {
    if (refusal === null) {
      return;
    }

    const timer = setTimeout(() => setRefusal(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [refusal]);

  return {
    play,
    shuffle,
    playTrack,
    retry,
    starting: pressInFlight !== null,
    startingPress: pressInFlight,
    retryable: failed !== null,
    refusal
  };
}

/*
 * The refusal in words: one sentence and a line, naming the playlist and why
 * the press did nothing. The action's copy, shared by every screen that draws
 * it.
 */
export function refusalNotice(
  refusal: PlayTransitionRefusal,
  t: Translator<Messages>
): {
  message: string;
  detail: string;
} {
  if (refusal.reason === StartFailure.Unreachable) {
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
