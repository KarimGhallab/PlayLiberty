import type { YoutubeUrlInfo } from '../types.js';
import { YoutubeSourceKind } from '../types.js';

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube-nocookie.com',
  'youtu.be'
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{6,}$/;
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/;

/*
 * The video-id shape, shared with the adapter. An id that fails it is not a video
 * id, so it must not be stored or used, and in particular must never become a
 * filesystem path.
 */
export function isValidVideoId(value: string): boolean {
  return VIDEO_ID_PATTERN.test(value);
}

export function validateYoutubeUrl(raw: string): YoutubeUrlInfo {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('The URL is not a valid absolute URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('The URL must use https.');
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error('The URL must not embed credentials.');
  }

  const host = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error('The URL host is not an allowed YouTube host.');
  }

  if (host === 'youtu.be') {
    const segments = parsed.pathname
      .split('/')
      .filter(segment => segment.length > 0);
    const videoId = segments[0] ?? '';
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      throw new Error('The URL does not contain a valid YouTube video id.');
    }
    return {
      kind: YoutubeSourceKind.Video,
      sourceId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  const playlistId = parsed.searchParams.get('list');
  if (playlistId !== null) {
    if (!PLAYLIST_ID_PATTERN.test(playlistId)) {
      throw new Error('The URL does not contain a valid YouTube playlist id.');
    }
    return {
      kind: YoutubeSourceKind.Playlist,
      sourceId: playlistId,
      url: `https://www.youtube.com/playlist?list=${playlistId}`
    };
  }

  const videoId = parsed.searchParams.get('v');
  if (videoId !== null) {
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      throw new Error('The URL does not contain a valid YouTube video id.');
    }
    return {
      kind: YoutubeSourceKind.Video,
      sourceId: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  throw new Error('The URL is not a YouTube playlist or video URL.');
}
