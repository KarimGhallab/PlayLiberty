import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@playliberty/i18n';

import Notice from '../../../shared/components/Notice/Notice';
import { isPlayable } from '../../../shared/playable/playable';
import type { TrackLinkNotice } from '../../../shared/trackLinkNotice/trackLinkNotice';
import {
  cannotPlayNotice,
  leftPlaylistNotice,
  unknownTrackNotice
} from '../../../shared/trackLinkNotice/trackLinkNotice';

import { useTrack } from '../../../api/useTrack';
import {
  SessionStatus,
  useSessionStore
} from '../../../auth/sessionStore/sessionStore';
import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import BareTrackLoading from '../BareTrackLoading/BareTrackLoading';
import { takeLeftPlaylistNotice } from '../leftPlaylistNotice/leftPlaylistNotice';

export interface BareTrackEntryProps {
  readonly trackId: string | null;
}

/* What the queue holds now; coarse enough that an advance inside a queue is
 * not mistaken for a start from this page. */
function queueIdentity(
  playlistId: string | null,
  currentId: string | null
): string | null {
  if (playlistId !== null) {
    return playlistId;
  }

  return currentId === null ? null : 'bare';
}

/*
 * The bare-track route's only body is the queue entry: the gallery is the page,
 * so this puts the track in a one-track queue, explains a track that cannot
 * play, and walks the address back when another queue starts.
 */
export default function BareTrackEntry({ trackId }: BareTrackEntryProps) {
  const { t } = useI18n();
  const status = useSessionStore(state => state.status);
  const track = useTrack(trackId, status === SessionStatus.SignedIn);
  const startBareTrack = usePlayerStore(state => state.startBareTrack);
  const playlistId = usePlayerStore(state => state.playlistId);
  const currentId = usePlayerStore(state => state.currentId);
  const barHeight = usePlayerBarHeight();
  const playerOffset = currentId === null ? 0 : barHeight;
  const [notice, setNotice] = useState<TrackLinkNotice | null>(null);
  const decided = useRef(false);
  const baseline = useRef<string | null>(null);
  const redirected = useRef(false);

  /* A reused route resolves a new id; the decision starts over. */
  useEffect(() => {
    decided.current = false;
    baseline.current = null;
    setNotice(null);
  }, [trackId]);

  useEffect(() => {
    if (decided.current || status !== SessionStatus.SignedIn) {
      return;
    }

    if (track.isError) {
      decided.current = true;
      takeLeftPlaylistNotice();
      baseline.current = queueIdentity(
        usePlayerStore.getState().playlistId,
        usePlayerStore.getState().currentId
      );
      setNotice(unknownTrackNotice(t));
      return;
    }

    if (track.data === undefined) {
      return;
    }

    const data = track.data;
    const left = takeLeftPlaylistNotice();

    decided.current = true;

    if (!isPlayable(data)) {
      baseline.current = queueIdentity(
        usePlayerStore.getState().playlistId,
        usePlayerStore.getState().currentId
      );
      setNotice(cannotPlayNotice(data, t));
      return;
    }

    if (left) {
      setNotice(leftPlaylistNotice(data.title, t));
    }

    const player = usePlayerStore.getState();
    const alreadyBare =
      player.playlistId === null &&
      player.currentId === data.id &&
      player.queue.length === 1 &&
      player.queue[0] === data.id;

    if (!alreadyBare) {
      startBareTrack({
        id: data.id,
        title: data.title,
        durationSeconds: data.durationSeconds,
        thumbnailPath: data.thumbnailPath
      });
    }

    baseline.current = queueIdentity(
      usePlayerStore.getState().playlistId,
      usePlayerStore.getState().currentId
    );
  }, [startBareTrack, status, t, track.data, track.isError]);

  /* A queue started from the gallery replaces the bare address. The queue found
   * on arrival is the baseline, so a failed entry leaves the address alone. */
  useEffect(() => {
    if (baseline.current === null || redirected.current) {
      return;
    }

    const current = usePlayerStore.getState();

    if (
      queueIdentity(current.playlistId, current.currentId) === baseline.current
    ) {
      return;
    }

    redirected.current = true;
    router.replace('/');
  }, [currentId, playlistId]);

  const loading =
    trackId !== null && status === SessionStatus.SignedIn && track.isPending;

  if (loading) {
    return <BareTrackLoading />;
  }

  return notice === null ? null : (
    <Notice
      message={notice.message}
      detail={notice.detail}
      onDismiss={() => setNotice(null)}
      bottomOffset={playerOffset}
    />
  );
}
