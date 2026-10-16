import { useMatchRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import type { Messages, Translator } from '@playliberty/i18n';
import { useI18n } from '@playliberty/i18n';

import { usePlaylist } from '../api/queries/queries';
import { usePlayerStore } from '../player/playerStore/playerStore';
import type { PlayerTrack } from '../player/types';
import { currentTrack } from '../player/types';

/*
 * The tab's title, the one place it is written. It follows where the listener is
 * and what is sounding: the app's name alone at home, the open playlist's name
 * once one is open, and the playing track's name under its playlist while one
 * plays. A track outranks the open playlist, because the track is what the tab is
 * for. The shape lives in the catalog with the rest of the copy, so a locale
 * punctuates it its own way.
 */
export function documentTitle(
  t: Translator<Messages>,
  playlistName: string | null,
  track: PlayerTrack | null
): string {
  const app = t('app.name');

  if (track !== null) {
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
 * Mounted once in the shell, so a route change and a track change compose into
 * one title rather than racing. The open playlist's name is read here and cached
 * by the detail page's own read, so the title does not fetch it twice.
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
