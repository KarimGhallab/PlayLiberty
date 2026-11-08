import { useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { useTrack } from '@playliberty/api-client';
import { useI18n } from '@playliberty/i18n';
import type { TrackLinkNotice } from '@playliberty/i18n';
import {
  cannotPlayNotice,
  leftPlaylistNotice,
  unknownTrackNotice
} from '@playliberty/i18n';
import { isPlayable } from '@playliberty/player';

import NoticeToast from '../../../shared/components/NoticeToast/NoticeToast';
import { usePlayerStore } from '../../../shared/player/playerStore/playerStore';
import { queuePlaylistId } from '../../../shared/player/types';
import { NOTICE_WINDOW_MS } from '../../../shared/player/usePlayTransition/usePlayTransition';

import LibraryPage from '../../library/LibraryPage/LibraryPage';

/*
 * A bare track link: the gallery stays the page, and the player holds one track
 * with no playlist. A track that cannot play leaves the gallery and explains.
 */

/* What the queue holds now, coarse enough that an advance inside a playlist is
 * not mistaken for a start from this page. */
function queueIdentity(): string | null {
  const player = usePlayerStore.getState();
  const playlistId = queuePlaylistId(player);

  if (playlistId !== null) {
    return playlistId;
  }

  return player.currentId === null ? null : 'bare';
}

export default function TrackPage() {
  const { t } = useI18n();
  const { trackId } = useParams({ from: '/tracks/$trackId' });
  const location = useLocation();
  const navigate = useNavigate();
  const track = useTrack(trackId);
  const [notice, setNotice] = useState<TrackLinkNotice | null>(null);
  const leftPlaylist =
    typeof location.state === 'object' &&
    location.state !== null &&
    'leftPlaylist' in location.state &&
    location.state.leftPlaylist === true;
  const decided = useRef(false);
  const baseline = useRef<string | null>(null);
  const currentId = usePlayerStore(state => state.currentId);
  const playingPlaylistId = usePlayerStore(queuePlaylistId);

  /* A reused route resolves a new id; the decision and its baseline start over. */
  useEffect(() => {
    decided.current = false;
    baseline.current = null;
    setNotice(null);
  }, [trackId]);

  useEffect(() => {
    if (decided.current) {
      return;
    }

    if (track.isError) {
      decided.current = true;
      baseline.current = queueIdentity();
      setNotice(unknownTrackNotice(t));
      return;
    }

    if (track.data === undefined) {
      return;
    }

    decided.current = true;

    if (!isPlayable(track.data)) {
      baseline.current = queueIdentity();
      setNotice(cannotPlayNotice(track.data, t));
      return;
    }

    if (leftPlaylist) {
      setNotice(leftPlaylistNotice(track.data.title, t));
    }

    const player = usePlayerStore.getState();

    if (
      queuePlaylistId(player) === null &&
      player.currentId === track.data.id
    ) {
      baseline.current = queueIdentity();
      return;
    }

    player.startBareTrack({
      id: track.data.id,
      title: track.data.title,
      durationSeconds: track.data.durationSeconds,
      thumbnailPath: track.data.thumbnailPath
    });
    baseline.current = queueIdentity();
  }, [leftPlaylist, t, track.data, track.isError]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timer = setTimeout(() => setNotice(null), NOTICE_WINDOW_MS);

    return () => clearTimeout(timer);
  }, [notice]);

  /* A queue started from the gallery makes the address the gallery's. The
   * queue this page found on arrival is the baseline, so a failed entry or an
   * advance in someone else's queue leaves the address alone. */
  useEffect(() => {
    if (baseline.current === null || queueIdentity() === baseline.current) {
      return;
    }

    void navigate({ to: '/', replace: true });
  }, [currentId, navigate, playingPlaylistId, trackId]);

  return (
    <>
      <LibraryPage />
      {notice === null ? null : (
        <NoticeToast
          message={notice.message}
          detail={notice.detail}
          durationMs={NOTICE_WINDOW_MS}
        />
      )}
    </>
  );
}
