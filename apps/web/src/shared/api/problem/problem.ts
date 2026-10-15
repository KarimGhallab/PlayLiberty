import { problemDetail } from '@playliberty/i18n';
import type { Messages, Translator } from '@playliberty/i18n';

import { ApiError } from '../client/client';

/*
 * The one seam where a refusal becomes a sentence. The API client throws an
 * `ApiError` carrying the server's problem document; every surface that shows a
 * refusal crosses here, so the unwrap and the catalog mapping are written once.
 */
export function problemSentence(
  t: Translator<Messages>,
  error: unknown
): string | null {
  return error instanceof ApiError ? problemDetail(t, error.problem) : null;
}
