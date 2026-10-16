import { validateYoutubeUrl } from '@playliberty/youtube';
import type { YoutubeUrlInfo } from '@playliberty/youtube';

/* The validator throws by design, so this wraps it into the nullable answer a
 * route needs instead of an exception each must remember to catch. */
export function resolveSourceUrl(raw: string): YoutubeUrlInfo | null {
  try {
    return validateYoutubeUrl(raw);
  } catch {
    return null;
  }
}
