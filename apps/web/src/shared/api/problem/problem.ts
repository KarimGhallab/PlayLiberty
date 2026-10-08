import { problemDetail } from '@playliberty/i18n';
import type { Messages, Translator } from '@playliberty/i18n';

import { ApiError } from '../client/client';

/*
 * An error as a sentence, or null when there is none to draw. The API client
 * throws an `ApiError` carrying the server's problem document; this unwraps it and
 * maps the code to a catalog sentence, falling back to the server's own `detail`
 * for a code the catalog does not know. Every surface that shows a refusal crosses
 * this one seam, so the unwrap and the mapping are written once.
 */
export function problemSentence(
  t: Translator<Messages>,
  error: unknown
): string | null {
  return error instanceof ApiError ? problemDetail(t, error.problem) : null;
}
