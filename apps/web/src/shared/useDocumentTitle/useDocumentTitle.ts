import { useMatchRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { usePlaylist } from '@playliberty/api-client';
import type { Messages, Translator } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import { usePlayerStore } from '../player/playerStore/playerStore';
import type { PlayerTrack } from '../player/types';
import { currentTrack } from '../player/types';

/*
 * The tab's title: app name at home, else the open playlist, else the playing
 * track under it. A track outranks a playlist; the catalog owns the shape.
 */
export function documentTitle(
  t: Translator<Messages>,
  playlistName: string | null,
  track: PlayerTrack | null
): string {
  const app = t('app.name');

  if (track !== null) {
    if (track.playlistName === null) {
      return t('app.title.bareTrack', { app, track: track.title });
    }

    return t('app.title.track', {
      app,
      playlist: track.playlistName,
      track: track.title
    });
  }

  if (playlistName !== null) {
    return t('app.title.playlist', { app, name: playlistName });
  }

  return app;
}

/*
 * Mounted once in the shell so a route change and a track change compose into
 * one title; the playlist read is shared with the detail's, not fetched twice.
 */
export function useDocumentTitle(): void {
  const { t } = useI18n();
  const matchRoute = useMatchRoute();
  const match = matchRoute({ to: '/playlists/$playlistId' });
  const playlist = usePlaylist(match === false ? null : match.playlistId);
  const current = usePlayerStore(currentTrack);
  const title = documentTitle(t, playlist.data?.name ?? null, current);

  useEffect(() => {
    document.title = title;
  }, [title]);
}
