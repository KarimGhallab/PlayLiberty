import { validateYoutubeUrl } from '@playliberty/youtube';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

/*
 * A URL that is not a YouTube playlist or video is not a source. The validator
 * throws by design, so it is wrapped into the answer a route needs rather than
 * left as an exception a route has to remember to catch. It sits in shared
 * because two features ask it: creating a synced playlist reads a playlist or a
 * video, and adding a video to playlists reads a video and refuses a playlist.
 */
export function resolveSourceUrl(raw: string): YoutubeUrlInfo | null {
  try {
    return validateYoutubeUrl(raw);
  } catch {
    return null;
  }
}
