import { ApiError } from '@playliberty/api-client';
import type { Messages, Translator } from '@playliberty/i18n';
import { problemDetail } from '@playliberty/i18n';

/*
 * The one seam where a refusal becomes a sentence: the client's `ApiError`
 * carries the server's problem document, so the unwrap and mapping are written
 * once.
 */
export function problemSentence(
  t: Translator<Messages>,
  error: unknown
): string | null {
  return error instanceof ApiError ? problemDetail(t, error.problem) : null;
}
