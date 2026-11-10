import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { useTrack } from '@playliberty/api-client';
import type { TrackLinkNotice } from '@playliberty/i18n';
import {
  cannotPlayNotice,
  leftPlaylistNotice,
  unknownTrackNotice,
  useI18n
} from '@playliberty/i18n';

import Notice from '../../../shared/components/Notice/Notice';

import {
  SessionStatus,
  useSessionStore
} from '../../../auth/sessionStore/sessionStore';
import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import { startBareTrack } from '../../../player/startPlayback/startPlayback';
import BareTrackLoading from '../BareTrackLoading';
import { takeLeftPlaylistNotice } from '../leftPlaylistNotice';

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

/* The gallery is the page: this puts the track in a one-track queue, explains
 * one that cannot play, and walks the address back when another queue starts. */
export default function BareTrackEntry({ trackId }: BareTrackEntryProps) {
  const { t } = useI18n();
  const status = useSessionStore(state => state.status);
  const track = useTrack(trackId, status === SessionStatus.SignedIn);
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

    if (startBareTrack(data) !== null) {
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

    baseline.current = queueIdentity(
      usePlayerStore.getState().playlistId,
      usePlayerStore.getState().currentId
    );
  }, [status, t, track.data, track.isError]);

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
