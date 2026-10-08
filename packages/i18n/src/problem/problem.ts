import type { Problem } from '@playliberty/contracts';

import type { Translator } from '../createTranslator/createTranslator.js';
import type { Messages } from '../en.js';

/*
 * A problem document as a sentence. The server owns a stable code and the
 * parameters that vary its copy; the client owns the words, so a known code maps
 * to a catalog sentence and anything else falls back to the server's own English.
 * The `detail` stays every server's fallback for a code this client does not know.
 */
export function problemDetail(
  t: Translator<Messages>,
  problem: Problem | null
): string | null {
  if (problem === null) {
    return null;
  }

  /*
   * One code, four scopes, and the scope is the only difference: the server names
   * the reason and the sentence comes from here.
   */
  if (problem.code === 'playlist_not_found') {
    const reason = problem.params?.reason;

    if (reason === 'read') {
      return t('problem.playlistNotFound.read');
    }
    if (reason === 'write') {
      return t('problem.playlistNotFound.write');
    }
    if (reason === 'manage') {
      return t('problem.playlistNotFound.manage');
    }
    if (reason === 'track') {
      return t('problem.playlistNotFound.track');
    }

    return problem.detail ?? null;
  }

  /*
   * Each of these carries one sentence, so the code is the whole difference and
   * the server's own English is only the fallback.
   */
  if (problem.code === 'invalid_request') {
    return t('problem.invalidRequest');
  }
  if (problem.code === 'unprocessable_request') {
    return t('problem.unprocessableRequest');
  }
  if (problem.code === 'validation_failed') {
    return t('problem.validationFailed');
  }

  return problem.detail ?? null;
}
