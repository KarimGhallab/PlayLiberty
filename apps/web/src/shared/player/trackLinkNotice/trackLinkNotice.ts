import { TrackFileStatus } from '@playliberty/contracts';
import type { Track } from '@playliberty/contracts';
import type { Messages, Translator } from '@playliberty/i18n';

/* The one wording for a track link that cannot play, shared by the playlist
 * entry and the bare route. */
export interface TrackLinkNotice {
  readonly message: string;
  readonly detail: string;
}

export function cannotPlayNotice(
  track: Pick<Track, 'title' | 'fileStatus'>,
  t: Translator<Messages>
): TrackLinkNotice {
  const detail =
    track.fileStatus === TrackFileStatus.Failed
      ? t('trackLink.downloadFailed')
      : track.fileStatus === TrackFileStatus.Unavailable
        ? t('trackLink.unavailableDetail')
        : t('trackLink.notStored');

  return {
    message: t('trackLink.cannotPlay', { title: track.title }),
    detail
  };
}

export function unknownTrackNotice(t: Translator<Messages>): TrackLinkNotice {
  return {
    message: t('trackLink.unknown'),
    detail: t('trackLink.unknownDetail')
  };
}

export function leftPlaylistNotice(
  title: string,
  t: Translator<Messages>
): TrackLinkNotice {
  return {
    message: t('trackLink.leftPlaylist', { title }),
    detail: t('trackLink.leftPlaylistDetail')
  };
}
